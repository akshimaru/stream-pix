"use client";

export function speakBrowserTts(input: {
  text: string;
  voiceName: string;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
}): Promise<"spoken" | "unsupported" | "error"> {
  return new Promise<"spoken" | "unsupported" | "error">((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve("unsupported");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(input.text);
    utterance.lang = input.language;
    utterance.rate = input.speed;
    utterance.pitch = input.pitch;
    utterance.volume = Math.min(1, Math.max(0, input.volume / 100));

    const normalizedVoiceName = input.voiceName.toLowerCase();
    const voice =
      window.speechSynthesis
        .getVoices()
        .find((candidate) => candidate.name.toLowerCase() === normalizedVoiceName) ??
      window.speechSynthesis
        .getVoices()
        .find((candidate) => candidate.name.toLowerCase().includes(normalizedVoiceName)) ??
      window.speechSynthesis
        .getVoices()
        .find((candidate) => candidate.lang.toLowerCase().includes(input.language.toLowerCase()));

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      resolve("spoken");
    };

    utterance.onerror = () => {
      resolve("error");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}
