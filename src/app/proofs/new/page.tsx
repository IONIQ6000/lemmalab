"use client";

import { useEffect } from "react";

export default function NewProofPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/proofs");
    }
  }, []);
  return null;
}


