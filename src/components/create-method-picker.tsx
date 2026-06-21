"use client";

import { useEffect, useRef, useState } from "react";
import { parseBulkTerms, type TermPair } from "@/lib/parse-bulk-terms";

type CreateMethod = "manual" | "camera" | "file";

function MethodIcon({ name }: { name: CreateMethod | "back" }) {
  const paths: Record<string, React.ReactNode> = {
    manual: <><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13 7 4 4"/></>,
    camera: <><path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3Z"/><circle cx="12" cy="13" r="4"/></>,
    file: <><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
  };

  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Placeholder({ method, onBack }: { method: Exclude<CreateMethod, "camera">; onBack: () => void }) {
  const isManual = method === "manual";
  return (
    <div className="create-placeholder">
      <button className="create-back" type="button" onClick={onBack}><MethodIcon name="back" /> Все способы</button>
      <span className="create-placeholder-icon"><MethodIcon name={method} /></span>
      <h2>{isManual ? "Создание вручную" : "Импорт файла"}</h2>
      <p>{isManual ? "Редактор карточек появится здесь в следующей версии." : "Скоро здесь можно будет загрузить таблицу или документ."}</p>
      <span className="coming-soon">Скоро</span>
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
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

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);

    setStatus("recognizing");
    setProgress(0);
    setMessage("Готовим распознавание…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["eng", "rus"], 1, {
        logger: ({ status: workerStatus, progress: workerProgress }) => {
          if (workerStatus === "recognizing text") {
            setProgress(Math.round(workerProgress * 100));
            setMessage("Распознаём слова и переводы…");
          }
        },
      });
      try {
        await worker.setParameters({ preserve_interword_spaces: "1" });
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
      <div className="camera-heading"><span>Распознавание</span><h2>Наведи камеру на список</h2><p>Лучше всего работают строки вида: <b>word — перевод</b></p></div>
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
  if (method) return <Placeholder method={method} onBack={() => setMethod(null)} />;

  const methods: Array<{ id: CreateMethod; title: string; description: string; badge?: string }> = [
    { id: "manual", title: "Создать вручную", description: "Добавить слова и переводы по одному", badge: "Скоро" },
    { id: "camera", title: "Распознать камерой", description: "Сфотографировать готовый список" },
    { id: "file", title: "Импортировать файл", description: "Загрузить таблицу или документ", badge: "Скоро" },
  ];

  return (
    <div className="create-methods">
      <p>Как вы хотите добавить слова?</p>
      <div className="create-method-list">
        {methods.map((item) => (
          <button key={item.id} type="button" onClick={() => setMethod(item.id)}>
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
