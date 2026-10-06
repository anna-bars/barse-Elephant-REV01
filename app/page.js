'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-canvas';

// ---- Names exactly as they appear in the .riv files ----
const BENCH_ARTBOARD = 'Bench';
const BENCH_SM = 'Bench_SM';
const HEADER_ARTBOARD = 'Header';
const HEADER_SM = 'Header_SM';

// Bench_SM: five boolean inputs (one true at a time) + one trigger.
const MOODS = [
  { key: 'Angry', idle: 'Angry_Idle', loop: '2.0 s' },
  { key: 'Sad', idle: 'Sad_Idle', loop: '5.0 s' },
  { key: 'Calm', idle: 'Calm_Idle', loop: '4.0 s' },
  { key: 'Happy', idle: 'Happy_Idle', loop: '2.5 s' },
  { key: 'Excited', idle: 'Excited_Idle', loop: '3.0 s' },
];

// Header_SM: one number input, 0–400, 1D blend with five evenly spaced stops.
const MAX = 400;
const STOPS = [
  { value: 0, label: 'Angry' },
  { value: 100, label: 'Sad' },
  { value: 200, label: 'Calm' },
  { value: 300, label: 'Happy' },
  { value: 400, label: 'Excited' },
];

const layout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });

export default function Page() {
  // ---------- Bench ----------
  const { rive: bench, RiveComponent: BenchCanvas } = useRive({
    src: '/elephant_bench.riv',
    artboard: BENCH_ARTBOARD,
    stateMachines: BENCH_SM,
    autoplay: true,
    layout,
  });

  const moodInputs = {
    Calm: useStateMachineInput(bench, BENCH_SM, 'Calm'),
    Sad: useStateMachineInput(bench, BENCH_SM, 'Sad'),
    Angry: useStateMachineInput(bench, BENCH_SM, 'Angry'),
    Happy: useStateMachineInput(bench, BENCH_SM, 'Happy'),
    Excited: useStateMachineInput(bench, BENCH_SM, 'Excited'),
  };
  const blink = useStateMachineInput(bench, BENCH_SM, 'Blink');

  const [mood, setMood] = useState(null);
  const [blinkFeed, setBlinkFeed] = useState({ count: 0, lastAt: null });

  // Only one mood boolean may be true at a time.
  const selectMood = (name) => {
    MOODS.forEach(({ key }) => {
      if (moodInputs[key]) moodInputs[key].value = key === name;
    });
    setMood(name);
  };
  const clearMood = () => {
    MOODS.forEach(({ key }) => {
      if (moodInputs[key]) moodInputs[key].value = false;
    });
    setMood(null);
  };

  // Auto blink — random 3–6 s cadence
  const blinkTimeout = useRef(null);
  useEffect(() => {
    if (!blink) return undefined;
    const schedule = () => {
      blinkTimeout.current = setTimeout(() => {
        blink.fire();
        setBlinkFeed((f) => ({ count: f.count + 1, lastAt: Date.now() }));
        schedule();
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(blinkTimeout.current);
  }, [blink]);

  // ---------- Header (face slider) ----------
  const { rive: header, RiveComponent: HeaderCanvas } = useRive({
    src: '/elephant_header.riv',
    artboard: HEADER_ARTBOARD,
    stateMachines: HEADER_SM,
    autoplay: true,
    layout,
  });
  const expression = useStateMachineInput(header, HEADER_SM, 'Expression');
  const [slider, setSlider] = useState(0);
  const sweepRef = useRef(null);

  useEffect(() => {
    if (expression) expression.value = slider;
  }, [expression, slider]);

  const stopSweep = () => {
    cancelAnimationFrame(sweepRef.current);
    sweepRef.current = null;
  };

  const onSlide = (v) => {
    stopSweep();
    setSlider(v);
  };

  // 0 → 400 in 8 s: 2 s per stage, proves the stages are evenly timed.
  const sweep = () => {
    stopSweep();
    const start = performance.now();
    const duration = 8000;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setSlider(Math.round(t * MAX));
      if (t < 1) sweepRef.current = requestAnimationFrame(tick);
    };
    sweepRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => stopSweep, []);

  const nearest = STOPS.reduce((a, b) =>
    Math.abs(b.value - slider) < Math.abs(a.value - slider) ? b : a
  );

  const allBenchWired = MOODS.every(({ key }) => moodInputs[key]);
  const [tab, setTab] = useState('bench');

  return (
    <>
      {/* ================= HERO — LIVE DEMO ================= */}
      <div className="layout">
        <div className="stage">
          <div className="stage-grid" />

          <div className="stage-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'bench'}
              className={`stage-tab ${tab === 'bench' ? 'active' : ''}`}
              onClick={() => setTab('bench')}
            >
              Bench
            </button>
            <button
              role="tab"
              aria-selected={tab === 'header'}
              className={`stage-tab ${tab === 'header' ? 'active' : ''}`}
              onClick={() => setTab('header')}
            >
              Face · Header
            </button>
          </div>

          <div className={`pane ${tab === 'bench' ? 'show' : ''}`}>
            <div className="canvas-wrap">
              <BenchCanvas />
            </div>
          </div>

          <div className={`pane ${tab === 'header' ? 'show' : ''}`}>
            <div className="canvas-wrap">
              <HeaderCanvas />
            </div>
          </div>

          <div className="stage-hex">#4719EA</div>
        </div>

        <div className="panel">
          <div className="top-tag">
            <span className="pulse" />
            Live State Machine
            <span className="update-pill">Mood tracker · v1.1</span>
          </div>
          <h1>Elephant Mood Tracker</h1>
          <p className="sub">
            Five looping mood idles on the bench, and a face-only artboard
            that blends smoothly between all five moods with a single number
            from 0 to 400.
          </p>

          {tab === 'bench' && (
          <>
          <div className="group-label">
            Bench moods ({BENCH_SM})
            {!allBenchWired && <span className="locked-tag">waiting on .riv</span>}
          </div>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {MOODS.map(({ key }) => (
              <button
                key={key}
                className={`chip-btn ${mood === key ? 'on' : ''}`}
                disabled={!moodInputs[key]}
                onClick={() => selectMood(key)}
              >
                <span className="chip-dot" />{key}
              </button>
            ))}
            <button className="chip-btn ghost" onClick={clearMood}>
              <span className="chip-dot" />Reset
            </button>
          </div>

          <div className="group-label">Blink</div>
          <div style={{ marginBottom: 30 }}>
            <button className="btn" onClick={() => blink && blink.fire()} disabled={!blink}>
              <span className="dot" />
              Blink
            </button>
          </div>
          </>
          )}

          {tab === 'header' && (
          <>

          <div className="group-label">
            Face slider ({HEADER_SM} · Expression)
            {expression ? <span className="live-tag">0 – 400</span> : <span className="locked-tag">waiting on .riv</span>}
          </div>
          <div className="card slider-card">
            <div className="slider-track">
              <input
                className="range"
                type="range"
                min="0"
                max={MAX}
                step="1"
                value={slider}
                disabled={!expression}
                style={{ '--p': `${(slider / MAX) * 100}%` }}
                onChange={(e) => onSlide(Number(e.target.value))}
                aria-label="Expression"
              />
              <div className="stops">
                {STOPS.map((s) => (
                  <button
                    key={s.value}
                    className={`stop ${nearest.value === s.value ? 'near' : ''}`}
                    style={{ left: `${(s.value / MAX) * 100}%` }}
                    onClick={() => onSlide(s.value)}
                  >
                    <i />
                    {s.label}
                    <span>{s.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="slider-actions">
            <button className="chip-btn" onClick={sweep} disabled={!expression}>
              <span className="chip-dot" />Sweep 0 → 400
            </button>
            <button className="chip-btn ghost" onClick={() => onSlide(0)} disabled={!expression}>
              <span className="chip-dot" />Reset
            </button>
          </div>

          </>
          )}

          <div className="state-readout">
            <span className="live-dot" />
            {tab === 'bench'
              ? <>bench mood: <b>{mood ?? 'none'}</b></>
              : <>Expression: <b>{slider}</b> · closest stage: <b>{nearest.label}</b></>}
          </div>

          <a className="scroll-cue" href="#overview">
            <span>Integration docs</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      {/* ================= DOCUMENTATION ================= */}
      <div className="docs">
        <div className="docs-shell">
          <DocsNav />

          <div className="docs-body">
            <DocSection id="overview" eyebrow="Overview" title="Two artboards, two state machines">
              <p>
                The mood tracker needs the elephant in two forms: the full
                bench scene with a looping idle per mood, and a close-up face
                that the app can scrub with a slider. They ship as two
                separate <code>.riv</code> files so each stays light and can be
                loaded independently.
              </p>
              <div className="update-grid">
                <div className="update-card system-a">
                  <div className="update-card-title">Bench</div>
                  <ul>
                    <li>Artboard <code>{BENCH_ARTBOARD}</code>, state machine <code>{BENCH_SM}</code></li>
                    <li>Five boolean inputs, one looping idle per mood</li>
                    <li>Separate <code>Blink</code> trigger on its own layer</li>
                  </ul>
                </div>
                <div className="update-card">
                  <div className="update-card-title">Face</div>
                  <ul>
                    <li>Artboard <code>{HEADER_ARTBOARD}</code>, state machine <code>{HEADER_SM}</code></li>
                    <li>One number input, <code>Expression</code>, 0 to 400</li>
                    <li>Five stops, 100 units apart, transparent background</li>
                  </ul>
                </div>
              </div>
            </DocSection>

            <DocSection id="bench" eyebrow="Bench" title="Mood idles">
              <p>
                Each mood has its own looping idle with its own timing and
                amplitude, so the moods read differently even before the face
                changes: Sad is slow and heavy, Angry is short and sharp,
                Excited has the largest motion.
              </p>
              <table className="stage-table">
                <thead>
                  <tr><th>Mood</th><th>Input</th><th>Animation</th><th>Loop</th></tr>
                </thead>
                <tbody>
                  {MOODS.map((m) => (
                    <tr key={m.key}>
                      <td>{m.key}</td>
                      <td><code>{m.key}</code> (bool)</td>
                      <td><code>{m.idle}</code></td>
                      <td>{m.loop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Blink</h3>
              <p>
                <code>Blink</code> is a trigger on a separate layer, so it
                fires independently of whichever idle is playing. The demo
                above fires it at a random 3 to 6 second cadence.
              </p>
              <LiveFeed
                label="Auto blink — live on the canvas above"
                count={blinkFeed.count}
                lastAt={blinkFeed.lastAt}
                noun="blink"
              />
            </DocSection>

            <DocSection id="face" eyebrow="Face" title="Face slider (0 to 400)">
              <p>
                <code>Expression</code> drives a 1D blend. Each stop is
                exactly 100 units from the next, so the time between faces is
                always the same and the slider position maps one-to-one onto
                the mood. Values between two stops are a smooth mix of the
                two faces.
              </p>
              <table className="stage-table">
                <thead>
                  <tr><th>Expression</th><th>Face</th></tr>
                </thead>
                <tbody>
                  {STOPS.map((s) => (
                    <tr key={s.value}><td>{s.value}</td><td>{s.label}</td></tr>
                  ))}
                </tbody>
              </table>
              <p>
                Bind the number directly to your slider. The order of the
                stops (Angry, Sad, Calm, Happy, Excited) is the order of the
                blend, so a mix between neighbours is always a blend of those
                two moods.
              </p>
            </DocSection>

            <DocSection id="state-machine" eyebrow="Architecture" title="State machines">
              <div className="tree-block">{`Bench_SM
  Layer "Main"
    Entry → Blank Idle (hub)
    Blank Idle ⇄ Calm_Idle     [Calm = true]
    Blank Idle ⇄ Sad_Idle      [Sad = true]
    Blank Idle ⇄ Angry_Idle    [Angry = true]
    Blank Idle ⇄ Happy_Idle    [Happy = true]
    Blank Idle ⇄ Excited_Idle  [Excited = true]
  Layer "Blink"
    Blink [Trigger] → plays Blink once

Header_SM
  1D Blend State on Expression
    0 Angry · 100 Sad · 200 Calm · 300 Happy · 400 Excited`}</div>
              <p>
                Set one mood boolean to <code>true</code> at a time. When all
                are false the elephant returns to the hub state.
              </p>
            </DocSection>

            <DocSection id="inputs" eyebrow="Reference" title="Input reference">
              <div className="inputs-grid">
                {MOODS.map((m) => (
                  <InputCard
                    key={m.key}
                    kind="Bool"
                    name={m.key}
                    desc={`Bench_SM. Switches the bench to ${m.idle}.`}
                  />
                ))}
                <InputCard kind="Trigger" name="Blink" desc="Bench_SM. Plays one blink, then resets." />
                <InputCard kind="Number" name="Expression" desc="Header_SM. 0 to 400. Blends between the five faces." />
              </div>
            </DocSection>

            <DocSection id="js" eyebrow="JavaScript" title="Web integration example">
              <CodeBlock code={JS_EXAMPLE} />
            </DocSection>

            <DocSection id="rn" eyebrow="React Native" title="React Native example">
              <CodeBlock code={RN_EXAMPLE} />
            </DocSection>

            <DocSection id="files" eyebrow="Files" title="Where the files live">
              <p>
                Both files are plain static assets. Put them in{' '}
                <code>/public</code> and load them by path, no backend or
                signed URL involved.
              </p>
              <div className="tree-block">{`public/
  elephant_bench.riv     artboard "Bench"   · Bench_SM
  elephant_header.riv    artboard "Header"  · Header_SM`}</div>
            </DocSection>

            <DocSection id="checklist" eyebrow="Integration Checklist" title="Ship it">
              <ul className="check-list boxes">
                <li>Load <code>elephant_bench.riv</code>, artboard <code>Bench</code>, state machine <code>Bench_SM</code></li>
                <li>Set exactly one of <code>Calm</code> / <code>Sad</code> / <code>Angry</code> / <code>Happy</code> / <code>Excited</code> to true</li>
                <li>Fire <code>Blink</code> every 3 to 6 seconds</li>
                <li>Load <code>elephant_header.riv</code>, artboard <code>Header</code>, state machine <code>Header_SM</code></li>
                <li>Bind your slider (0 to 400) to <code>Expression</code></li>
                <li>Done</li>
              </ul>
            </DocSection>

            <footer className="docs-footer">
              Elephant Mood Tracker · Rive integration docs
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}

function DocsNav() {
  const items = [
    ['overview', 'Overview'],
    ['bench', 'Mood Idles'],
    ['face', 'Face Slider'],
    ['state-machine', 'State Machines'],
    ['inputs', 'Inputs'],
    ['js', 'JavaScript'],
    ['rn', 'React Native'],
    ['files', 'Files'],
    ['checklist', 'Checklist'],
  ];
  return (
    <nav className="docs-nav">
      <div className="docs-nav-label">Contents</div>
      {items.map(([id, label]) => (
        <a key={id} href={`#${id}`}>{label}</a>
      ))}
    </nav>
  );
}

function DocSection({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="doc-section">
      <div className="doc-eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function InputCard({ kind, name, desc }) {
  return (
    <div className="input-card">
      <div className="input-kind">{kind}</div>
      <code>{name}</code>
      <p>{desc}</p>
    </div>
  );
}

function LiveFeed({ label, count, lastAt, noun }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = lastAt ? Math.max(0, Math.round((Date.now() - lastAt) / 1000)) : null;

  return (
    <div className="live-feed">
      <span className="live-feed-dot" />
      <span className="live-feed-label">{label}</span>
      <span className="live-feed-value">
        {count === 0 ? `waiting for first ${noun}…` : `${count} fired · last ${secondsAgo}s ago`}
      </span>
    </div>
  );
}

function CodeBlock({ code }) {
  return <pre className="code-block"><code>{code}</code></pre>;
}

const JS_EXAMPLE = `import { Rive, Fit, Alignment, Layout } from '@rive-app/canvas'

// Bench: five mood booleans + Blink
const bench = new Rive({
  src: '/elephant_bench.riv',
  canvas: document.getElementById('bench-canvas'),
  artboard: 'Bench',
  stateMachines: 'Bench_SM',
  autoplay: true,
  layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  onLoad: () => {
    const inputs = bench.stateMachineInputs('Bench_SM')
    const mood = (name) =>
      inputs.forEach((i) => {
        if (['Calm', 'Sad', 'Angry', 'Happy', 'Excited'].includes(i.name)) {
          i.value = i.name === name   // one true at a time
        }
      })
    mood('Happy')
    inputs.find((i) => i.name === 'Blink').fire()
  },
})

// Face: one number, 0 to 400
const face = new Rive({
  src: '/elephant_header.riv',
  canvas: document.getElementById('face-canvas'),
  artboard: 'Header',
  stateMachines: 'Header_SM',
  autoplay: true,
  onLoad: () => {
    const expression = face
      .stateMachineInputs('Header_SM')
      .find((i) => i.name === 'Expression')

    // 0 Angry · 100 Sad · 200 Calm · 300 Happy · 400 Excited
    slider.addEventListener('input', () => {
      expression.value = Number(slider.value)   // slider min=0 max=400
    })
  },
})`;

const RN_EXAMPLE = `import Rive from 'rive-react-native'

export function ElephantBench({ mood }) {
  const riveRef = useRef(null)
  const SM = 'Bench_SM'

  useEffect(() => {
    ;['Calm', 'Sad', 'Angry', 'Happy', 'Excited'].forEach((name) =>
      riveRef.current?.setInputState(SM, name, name === mood)
    )
  }, [mood])

  return (
    <Rive
      ref={riveRef}
      resourceName="elephant_bench"
      artboardName="Bench"
      stateMachineName={SM}
      autoplay
      style={{ width: '100%', height: 320 }}
    />
  )
}

export function ElephantFace({ value }) {   // value: 0 to 400
  const riveRef = useRef(null)

  useEffect(() => {
    riveRef.current?.setInputState('Header_SM', 'Expression', value)
  }, [value])

  return (
    <Rive
      ref={riveRef}
      resourceName="elephant_header"
      artboardName="Header"
      stateMachineName="Header_SM"
      autoplay
      style={{ width: '100%', height: 240 }}
    />
  )
}`;
