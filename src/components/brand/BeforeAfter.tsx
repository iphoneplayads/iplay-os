import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Comparador ANTES/DEPOIS (Sem iPlay / Com iPlay).
 * Leve: React + pointer events + clip-path, sem bibliotecas.
 *
 * ASSETS DO COMPARADOR PENDENTES — quando existirem, passe:
 *   <BeforeAfter beforeSrc="/brand/iphone-broken.webp" afterSrc="/brand/iphone-repaired.webp" />
 * Exigência: mesmo aparelho, ângulo, posição, enquadramento, dimensões e
 * background nas duas imagens (só muda quebrado → reparado).
 * Sem os assets, exibe o estado preparado (moldura + slider funcionais).
 */
export function BeforeAfter({ beforeSrc, afterSrc }: { beforeSrc?: string; afterSrc?: string }) {
  const [pos, setPos] = useState(50);
  const [hint, setHint] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const ready = Boolean(beforeSrc && afterSrc);

  const setFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)));
  }, []);

  // Microinteração única: desloca alguns pixels e volta (ensina o arrasto).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = (t - t0) / 900;
      if (k >= 1) {
        setPos(50);
        return;
      }
      setPos(50 + Math.sin(k * Math.PI) * 6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPos((p) => Math.max(4, p - step));
      setHint(false);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPos((p) => Math.min(96, p + step));
      setHint(false);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPos(4);
      setHint(false);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPos(96);
      setHint(false);
    }
  }

  return (
    <div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Comparar: iPhone sem iPlay e com iPlay. Arraste ou use as setas."
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(100 - pos)}% sem iPlay, ${Math.round(pos)}% com iPlay`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          dragging.current = true;
          trackRef.current?.setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
          setHint(false);
        }}
        onPointerMove={(e) => {
          if (dragging.current) setFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        className="relative mx-auto aspect-[2/3] w-full max-w-[520px] cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-3xl bg-transparent"
      >
        {/* glow atrás do aparelho (fundo compartilhado = alinhamento garantido) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 blur-2xl"
          style={{
            background: 'radial-gradient(60% 50% at 50% 42%, rgba(180,240,0,0.20) 0, transparent 70%)',
            maskImage: 'radial-gradient(75% 75% at 50% 45%, black 25%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(75% 75% at 50% 45%, black 25%, transparent 78%)',
          }}
        />
        {ready ? (
          <>
            {/* base: SEM iPlay — mesmo enquadramento do overlay (object-cover +
                mesma caixa = alinhamento garantido; sem scale/distortion) */}
            <img src={beforeSrc} alt="iPhone com tela quebrada" draggable={false} loading="eager" decoding="async" className="absolute inset-0 h-full w-full rounded-3xl object-cover [filter:drop-shadow(0_30px_45px_rgba(0,0,0,0.55))]" style={{ objectPosition: '50% 50%' }} />
            {/* overlay: COM iPlay (recortado pela posição do slider) */}
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
              <img src={afterSrc} alt="iPhone com tela perfeita" draggable={false} loading="eager" decoding="async" className="absolute inset-0 h-full w-full rounded-3xl object-cover [filter:drop-shadow(0_30px_45px_rgba(0,0,0,0.55))]" style={{ objectPosition: '50% 50%' }} />
            </div>
            {/* fusão das bordas com o fundo do Hero */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background: 'radial-gradient(115% 115% at 50% 45%, transparent 44%, #0A0F0D 100%)',
                boxShadow: 'inset 0 0 110px 34px #0A0F0D',
              }}
            />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-linha text-center sm:inset-10">
            <p className="font-display text-sm font-extrabold tracking-wide text-gelo">
              ASSETS DO COMPARADOR PENDENTES
            </p>
            <p className="mt-2 max-w-xs font-mono text-[11px] leading-relaxed text-cinza">
              /brand/iphone-broken.webp
              <br />
              /brand/iphone-repaired.webp
            </p>
          </div>
        )}
        {/* divisória */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-lima" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lima text-noite shadow-[0_0_32px_rgba(180,240,0,0.45)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5 4 12l5 7" />
              <path d="M15 5l5 7-5 7" />
            </svg>
          </span>
        </div>
        {/* labels */}
        <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-linha bg-noite/90 px-4 py-2 text-sm font-bold text-cinza">
          ✕ Sem iPlay
        </span>
        <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-lima px-4 py-2 text-sm font-bold text-noite">
          ✓ Com iPlay
        </span>
      </div>
      {hint && (
        <p className="mt-2 text-center text-xs text-cinza">
          Arraste para comparar o antes e o depois
        </p>
      )}
    </div>
  );
}
