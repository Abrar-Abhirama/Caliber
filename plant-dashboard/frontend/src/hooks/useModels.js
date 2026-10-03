import { useEffect, useState } from "react";
import { api } from "../services/api.js";

const STORAGE_KEY = "plant-hub-model";

const loadSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

// Free-tier Gemini models come from the backend so the list lives in one place.
export function useModels() {
  const [models, setModels] = useState([]);
  const [model, setModelState] = useState(loadSaved);

  useEffect(() => {
    let cancelled = false;
    api
      .getModels()
      .then(({ data }) => {
        if (cancelled) return;
        setModels(data.models);
        // A saved model that is no longer offered (e.g. the removed 2.5 models) falls back to the default.
        setModelState((saved) => {
          if (data.models.some((m) => m.id === saved)) return saved;
          try {
            localStorage.setItem(STORAGE_KEY, data.defaultModel);
          } catch {
            // Choice just won't persist.
          }
          return data.defaultModel;
        });
      })
      .catch(() => {
        // Backend unreachable: hide the picker and let the backend use its default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setModel = (id) => {
    setModelState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Choice just won't persist.
    }
  };

  return { models, model, setModel };
}
