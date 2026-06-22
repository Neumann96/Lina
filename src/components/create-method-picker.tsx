"use client";

import { useEffect, useRef, useState } from "react";
import { parseBulkTerms, type TermPair } from "@/lib/parse-bulk-terms";
import { CardImporter } from "@/components/card-importer";

type CreateMethod = "manual" | "camera" | "file";
const CAMERA_GUIDE_INSET = 0.08;

function prepareCameraFrame(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const displayAspect = video.clientWidth / video.clientHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let visibleWidth = sourceWidth;
  let visibleHeight = sourceHeight;
  let visibleX = 0;
  let visibleY = 0;

  // The preview uses object-fit: cover. Map its visible guide back to the
  // original camera pixels so OCR does not scan the surrounding background.
  if (sourceAspect > displayAspect) {
    visibleWidth = sourceHeight * displayAspect;
    visibleX = (sourceWidth - visibleWidth) / 2;
  } else {
    visibleHeight = sourceWidth / displayAspect;
    visibleY = (sourceHeight - visibleHeight) / 2;
  }

  const cropX = visibleX + visibleWidth * CAMERA_GUIDE_INSET;
  const cropY = visibleY + visibleHeight * CAMERA_GUIDE_INSET;
  const cropWidth = visibleWidth * (1 - CAMERA_GUIDE_INSET * 2);
  const cropHeight = visibleHeight * (1 - CAMERA_GUIDE_INSET * 2);
  const scale = Math.min(2, 2400 / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth * scale);
  canvas.height = Math.round(cropHeight * scale);

  const context = canvas.getContext("2d");
  if (!context) return null;
  context.filter = "grayscale(1) contrast(1.6)";
  context.drawImage(
    video,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

function MethodIcon({ name }: { name: CreateMethod | "back" }) {
  const paths: Record<string, React.ReactNode> = {
    manual: <><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13 7 4 4"/></>,
    camera: <><path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3Z"/><circle cx="12" cy="13" r="4"/></>,
    file: <><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
  };

  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

type ManualCard = { id: number; term: string; definition: string };

function ManualCardEditor({ onBack }: { onBack: () => void }) {
  const nextId = useRef(3);
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<ManualCard[]>([
    { id: 1, term: "", definition: "" },
    { id: 2, term: "", definition: "" },
  ]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function updateCard(id: number, key: "term" | "definition", value: string) {
    setCards((current) => current.map((card) => card.id === id ? { ...card, [key]: value } : card));
    if (error) setError("");
  }

  function addCard() {
    setCards((current) => [...current, { id: nextId.current++, term: "", definition: "" }]);
  }

  function removeCard(id: number) {
    setCards((current) => current.length === 1
      ? current.map((card) => card.id === id ? { ...card, term: "", definition: "" } : card)
      : current.filter((card) => card.id !== id));
  }

  async function createSet() {
    if (!title.trim()) {
      setError("Добавьте название набора");
      return;
    }

    const hasHalfFilledCard = cards.some((card) => Boolean(card.term.trim()) !== Boolean(card.definition.trim()));
    const completeCards = cards
      .map(({ term, definition }) => ({ term: term.trim(), definition: definition.trim() }))
      .filter((card) => card.term && card.definition);

    if (hasHalfFilledCard) {
      setError("Заполните обе стороны каждой начатой карточки");
      return;
    }
    if (completeCards.length === 0) {
      setError("Добавьте хотя бы одну заполненную карточку");
      return;
    }

    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), cards: completeCards }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        setError(result.error ?? "Не удалось создать набор");
        return;
      }
      window.location.assign(`/study/${result.id}`);
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="manual-editor">
      <div className="manual-editor-topbar">
        <button className="create-back" type="button" onClick={onBack} disabled={pending}><MethodIcon name="back" /> Все способы</button>
        <button className="manual-create-top" type="button" onClick={createSet} disabled={pending}>{pending ? "Создаём…" : "Создать"}</button>
      </div>

      <div className="manual-heading">
        <span>Новый набор</span>
        <h2>Создать карточки</h2>
      </div>

      <label className="manual-title-field">
        <input value={title} onChange={(event) => { setTitle(event.target.value); if (error) setError(""); }} placeholder="Введите название, например «Английский — урок 1»" maxLength={120} autoFocus />
        <span>НАЗВАНИЕ</span>
      </label>

      <div className="manual-card-list">
        {cards.map((card, index) => (
          <article className="manual-card" key={card.id}>
            <header><strong>{index + 1}</strong><button type="button" onClick={() => removeCard(card.id)} aria-label={`Удалить карточку ${index + 1}`} disabled={pending}><span aria-hidden>×</span></button></header>
            <div>
              <label><textarea value={card.term} onChange={(event) => updateCard(card.id, "term", event.target.value)} maxLength={500} rows={2} aria-label={`Термин ${index + 1}`} /><span>ТЕРМИН</span></label>
              <label><textarea value={card.definition} onChange={(event) => updateCard(card.id, "definition", event.target.value)} maxLength={1000} rows={2} aria-label={`Определение ${index + 1}`} /><span>ОПРЕДЕЛЕНИЕ</span></label>
            </div>
          </article>
        ))}
      </div>

      <button className="manual-add-card" type="button" onClick={addCard} disabled={pending || cards.length >= 500}><span>+</span> Добавить карточку</button>
      {error && <p className="manual-error" role="alert">{error}</p>}
      <button className="manual-create-bottom" type="button" onClick={createSet} disabled={pending}>{pending ? "Создаём набор…" : "Создать набор"}</button>
    </div>
  );
}

function CameraRecognizer({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "recognizing" | "done" | "error">("starting");
  const [message, setMessage] = useState("Запрашиваем доступ к камере…");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [pairs, setPairs] = useState<TermPair[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setMessage("Камера недоступна в этом браузере. Откройте Lina по HTTPS на телефоне.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 2560 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
        setMessage("Держите список ровно и снимите его целиком");
      } catch {
        setStatus("error");
        setMessage("Не удалось открыть камеру. Разрешите доступ в настройках браузера и попробуйте снова.");
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function recognizeFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || status !== "ready") return;

    const canvas = prepareCameraFrame(video);
    if (!canvas) return;

    setStatus("recognizing");
    setProgress(0);
    setMessage("Готовим распознавание…");
    try {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker(["eng", "rus"], 1, {
        logger: ({ status: workerStatus, progress: workerProgress }) => {
          if (workerStatus === "recognizing text") {
            setProgress(Math.round(workerProgress * 100));
            setMessage("Распознаём слова и переводы…");
          }
        },
      });
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        });
        const result = await worker.recognize(canvas);
        const recognized = result.data.text.trim();
        const recognizedPairs = parseBulkTerms(recognized);
        setText(recognized);
        setPairs(recognizedPairs);
        setStatus("done");
        setMessage(recognized ? `Найдено строк: ${recognizedPairs.length}` : "Текст не найден. Попробуйте снять ближе и при хорошем свете.");
      } finally {
        await worker.terminate();
      }
    } catch {
      setStatus("error");
      setMessage("Распознавание не запустилось. Проверьте интернет и попробуйте ещё раз.");
    }
  }

  function retry() {
    setText("");
    setPairs([]);
    setProgress(0);
    setStatus("ready");
    setMessage("Держите список ровно и снимите его целиком");
  }

  return (
    <div className="camera-recognizer">
      <button className="create-back" type="button" onClick={onBack}><MethodIcon name="back" /> Все способы</button>
      <div className="camera-heading"><span>Распознавание</span><h2>Наведи камеру на список</h2><p>Разделяйте слово и перевод <b>пробелом, тире, двоеточием, точкой с запятой или запятой</b></p></div>
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline aria-label="Изображение с камеры" />
        <span className="camera-guide" aria-hidden="true" />
        {status === "recognizing" && <div className="camera-progress"><strong>{progress}%</strong><span><i style={{ width: `${progress}%` }} /></span></div>}
      </div>
      <p className={`camera-status${status === "error" ? " error" : ""}`} role="status">{message}</p>
      {status === "ready" && <button className="camera-capture" type="button" onClick={recognizeFrame}><span /> Сфотографировать и распознать</button>}
      {status === "error" && <button className="camera-secondary" type="button" onClick={onBack}>Вернуться к способам</button>}
      {status === "done" && (
        <div className="ocr-result">
          <div className="ocr-result-heading"><div><span>Результат</span><h3>Проверьте распознанный текст</h3></div><button type="button" onClick={retry}>Переснять</button></div>
          {pairs.length ? <div className="ocr-pairs">{pairs.map((pair, index) => <div key={pair.id}><b>{index + 1}</b><span>{pair.term || "—"}</span><i>→</i><span className={!pair.definition ? "missing" : ""}>{pair.definition || "Перевод не найден"}</span></div>)}</div> : <pre>{text || "Текст не найден"}</pre>}
          <button className="camera-secondary" type="button" disabled>Продолжить создание <small>скоро</small></button>
        </div>
      )}
    </div>
  );
}

export function CreateMethodPicker() {
  const [method, setMethod] = useState<CreateMethod | null>(null);

  if (method === "camera") return <CameraRecognizer onBack={() => setMethod(null)} />;
  if (method === "file") return <CardImporter onBack={() => setMethod(null)} />;
  if (method === "manual") return <ManualCardEditor onBack={() => setMethod(null)} />;

  const methods: Array<{ id: CreateMethod; title: string; description: string; badge?: string; disabled?: boolean }> = [
    { id: "manual", title: "Создать вручную", description: "Добавить слова и переводы по одному" },
    { id: "camera", title: "Распознать камерой", description: "Сфотографировать готовый список", badge: "Скоро", disabled: true },
    { id: "file", title: "Импортировать", description: "Ссылка Quizlet или готовый текст" },
  ];

  return (
    <div className="create-methods">
      <p>Как вы хотите добавить слова?</p>
      <div className="create-method-list">
        {methods.map((item) => (
          <button key={item.id} type="button" disabled={item.disabled} onClick={() => setMethod(item.id)}>
            <span className={`create-method-icon ${item.id}`}><MethodIcon name={item.id} /></span>
            <span className="create-method-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
            {item.badge ? <em>{item.badge}</em> : <span className="create-method-arrow">›</span>}
          </button>
        ))}
      </div>
      <div className="create-tip"><span>✦</span><p><strong>Совет</strong>Для камеры используйте ровный лист и яркий рассеянный свет.</p></div>
    </div>
  );
}
