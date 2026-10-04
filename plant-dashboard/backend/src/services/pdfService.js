import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { config } from "../config/index.js";
import { knowledgeService } from "./knowledgeService.js";
import { logger } from "../utils/logger.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const KNOWN_ASSETS = [
  "GA-1201A",
  "YD-2301",
  "DC-3401A",
  "KC-4501",
  "EA-5601",
  "LV-6701",
  "CT-7801",
  "FA-8901",
];

export class PdfService {
  constructor() {
    this.kbPath = config.knowledgeBasePath;
  }

  /**
   * Extract text and metadata from a PDF buffer.
   */
  async extractText(buffer) {
    let parser = null;
    try {
      parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      let infoResult = {};
      try {
        infoResult = await parser.getInfo();
      } catch (e) {
        logger.warn("Could not extract PDF info metadata:", e.message);
      }

      const pages = (textResult.pages || []).map((p, idx) => ({
        num: p.num || idx + 1,
        text: (p.text || "").trim(),
      }));

      return {
        text: textResult.text || "",
        total: textResult.total || pages.length || 1,
        pages,
        info: infoResult || {},
      };
    } finally {
      if (parser && typeof parser.destroy === "function") {
        try {
          await parser.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  /**
   * Auto-detect equipment tag from text if not provided.
   */
  detectAssetTag(text) {
    if (!text) return null;
    const upper = text.toUpperCase();
    for (const tag of KNOWN_ASSETS) {
      if (upper.includes(tag)) {
        return tag;
      }
    }
    // Also check without hyphens, e.g. GA1201A
    for (const tag of KNOWN_ASSETS) {
      const noHyphen = tag.replace("-", "");
      if (upper.includes(noHyphen)) {
        return tag;
      }
    }
    return null;
  }

  /**
   * Sanitize a title into a valid filename/doc_id slug.
   */
  slugify(text) {
    return String(text || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36);
  }

  /**
   * Format the extracted PDF content into structured Markdown with YAML frontmatter.
   */
  createMarkdownDocument({
    docId,
    title,
    assetTag,
    docType,
    originalFilename,
    pageCount,
    pdfUrl,
    pages,
    rawText,
  }) {
    const today = new Date().toISOString().split("T")[0];
    const cleanTitle = (title || path.basename(originalFilename, ".pdf")).trim();

    // Build structured sections per page
    const sectionsContent = [];
    if (pages && pages.length > 0) {
      for (const p of pages) {
        if (!p.text) continue;
        sectionsContent.push(`## Page ${p.num}\n\n${p.text}`);
      }
    } else if (rawText) {
      // Fallback: chunk rawText by paragraphs of ~1500 chars
      const paras = rawText.split(/\r?\n\s*\r?\n/);
      let currentSection = [];
      let currentLen = 0;
      let secIdx = 1;

      for (const para of paras) {
        const trimmed = para.trim();
        if (!trimmed) continue;
        currentSection.push(trimmed);
        currentLen += trimmed.length;

        if (currentLen > 1400) {
          sectionsContent.push(`## Section ${secIdx}\n\n${currentSection.join("\n\n")}`);
          currentSection = [];
          currentLen = 0;
          secIdx++;
        }
      }

      if (currentSection.length > 0) {
        sectionsContent.push(`## Section ${secIdx}\n\n${currentSection.join("\n\n")}`);
      }
    }

    const frontmatter = [
      "---",
      `doc_id: "${docId}"`,
      `title: "${cleanTitle.replace(/"/g, '\\"')}"`,
      `equipment_tag: "${assetTag || "PLANT"}"`,
      `record_type: "document"`,
      `doc_type: "${docType || "Manual"}"`,
      `date: "${today}"`,
      `source_format: "pdf"`,
      `original_filename: "${originalFilename.replace(/"/g, '\\"')}"`,
      `page_count: ${pageCount || 1}`,
      `pdf_url: "${pdfUrl}"`,
      `status: "Approved"`,
      "---",
      "",
      `# ${cleanTitle}`,
      "",
      "## Document Overview",
      `- **Asset / Equipment Tag**: ${assetTag || "Plant-wide / General"}`,
      `- **Document Type**: ${docType || "Manual"}`,
      `- **Original File**: ${originalFilename} (${pageCount || 1} pages)`,
      `- **Date Added**: ${today}`,
      "",
      sectionsContent.join("\n\n"),
      "",
    ].join("\n");

    return frontmatter;
  }

  /**
   * Process uploaded PDF buffer, save both original PDF and markdown, and re-index KB.
   */
  async processAndAddPdf({ buffer, originalFilename, customTitle, customAssetTag, customDocType }) {
    logger.info(`[PdfService] Processing uploaded PDF: ${originalFilename} (${buffer.length} bytes)`);

    // 1. Extract text and metadata
    const extracted = await this.extractText(buffer);
    if (!extracted.text || extracted.text.trim().length === 0) {
      throw new Error("Could not extract any readable text from this PDF. Please ensure the PDF contains text (not just scanned images).");
    }

    // 2. Resolve equipment asset tag
    let assetTag = (customAssetTag || "").trim();
    if (!assetTag || assetTag === "AUTO") {
      assetTag = this.detectAssetTag(extracted.text) || "PLANT";
    }

    // 3. Resolve title
    let title = (customTitle || "").trim();
    if (!title) {
      title = path.basename(originalFilename, path.extname(originalFilename))
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const docType = (customDocType || "Manual").trim();

    // 4. Generate unique doc_id
    const tagPrefix = assetTag.replace(/[^A-Z0-9]/gi, "");
    const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const slug = this.slugify(title);
    const docId = `DOC-${assetTag}-${slug ? slug.slice(0, 18) : "PDF"}-${randomSuffix}`;

    // 5. Setup directories
    const uploadsDir = path.join(this.kbPath, "uploads", "pdf", assetTag);
    const docsDir = path.join(this.kbPath, "documents", assetTag);
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(docsDir, { recursive: true });

    // 6. Save original PDF file
    const safeFilename = `${Date.now()}-${this.slugify(originalFilename)}.pdf`;
    const pdfFilePath = path.join(uploadsDir, safeFilename);
    fs.writeFileSync(pdfFilePath, buffer);
    const pdfUrl = `/api/documents/pdf/${encodeURIComponent(assetTag)}/${encodeURIComponent(safeFilename)}`;

    // 7. Generate and save Markdown document
    const markdownContent = this.createMarkdownDocument({
      docId,
      title,
      assetTag,
      docType,
      originalFilename,
      pageCount: extracted.total,
      pdfUrl,
      pages: extracted.pages,
      rawText: extracted.text,
    });

    const mdFilePath = path.join(docsDir, `${docId}.md`);
    fs.writeFileSync(mdFilePath, markdownContent, "utf-8");
    logger.info(`[PdfService] Saved markdown document to: ${mdFilePath}`);

    // 8. Re-index Knowledge Base dynamically
    knowledgeService.loadAndIndexMarkdownFiles();
    logger.info(
      `[PdfService] Re-indexed knowledge base: ${knowledgeService.docMap.size} documents, ${knowledgeService.chunks.length} passages.`
    );

    return {
      docId,
      title,
      assetTag,
      docType,
      originalFilename,
      pageCount: extracted.total,
      pdfUrl,
      filePath: mdFilePath,
      totalPassages: knowledgeService.chunks.length,
      snippet: extracted.text.slice(0, 240).replace(/\s+/g, " "),
    };
  }
}

export const pdfService = new PdfService();
