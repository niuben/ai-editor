"use client";

import { useMemo, useState } from "react";

import { callDeepSeek, getErrorMessage } from "../lib/deepseek";

type GeneratedStep = "characters_plot" | "worldview" | "style";

type StepState = {
  content: string;
  isLoading: boolean;
  error: string | null;
};

const generatedStepLabels: Record<GeneratedStep, string> = {
  characters_plot: "角色和情节",
  worldview: "小说世界观",
  style: "整体风格",
};

const generatedStepDescriptions: Record<GeneratedStep, string> = {
  characters_plot: "基于一句话故事，拆出主角、关键配角、冲突来源和核心情节点。",
  worldview: "承接角色与情节，补齐故事运行的时代、规则、势力和限制。",
  style: "确定最终小说的叙事视角、文笔气质、节奏和语言边界。",
};

function createStepState(): StepState {
  return {
    content: "",
    isLoading: false,
    error: null,
  };
}

export function NovelPlannerPage() {
  const [premise, setPremise] = useState("");
  const [steps, setSteps] = useState<Record<GeneratedStep, StepState>>({
    characters_plot: createStepState(),
    worldview: createStepState(),
    style: createStepState(),
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [finalNovel, setFinalNovel] = useState("");
  const [isGeneratingNovel, setIsGeneratingNovel] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);

  const canGenerateCharacters = Boolean(premise.trim());
  const canGenerateWorldview = canGenerateCharacters && Boolean(steps.characters_plot.content);
  const canGenerateStyle = canGenerateWorldview && Boolean(steps.worldview.content);
  const canGenerateNovel = canGenerateStyle && Boolean(steps.style.content);

  const contextSummary = useMemo(
    () =>
      [
        premise.trim() ? `一句话故事：${premise.trim()}` : "",
        steps.characters_plot.content ? `角色和情节：\n${steps.characters_plot.content}` : "",
        steps.worldview.content ? `世界观：\n${steps.worldview.content}` : "",
        steps.style.content ? `整体风格：\n${steps.style.content}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    [premise, steps],
  );

  async function generateStep(step: GeneratedStep) {
    if (!premise.trim() || steps[step].isLoading) return;

    setSteps((current) => ({
      ...current,
      [step]: { ...current[step], isLoading: true, error: null },
    }));

    try {
      const content = await callDeepSeek({
        mode: "plan_step",
        step,
        context: {
          premise,
          charactersPlot: steps.characters_plot.content,
          worldview: steps.worldview.content,
          style: steps.style.content,
        },
      });

      setSteps((current) => ({
        ...current,
        [step]: { content, isLoading: false, error: null },
      }));

      if (step === "characters_plot") setActiveIndex(2);
      if (step === "worldview") setActiveIndex(3);
    } catch (error) {
      setSteps((current) => ({
        ...current,
        [step]: { ...current[step], isLoading: false, error: getErrorMessage(error) },
      }));
    }
  }

  async function generateFinalNovel() {
    if (!canGenerateNovel || isGeneratingNovel) return;

    setIsGeneratingNovel(true);
    setFinalError(null);
    setFinalNovel("");

    try {
      const content = await callDeepSeek({
        mode: "novel",
        prompt: `${contextSummary}\n\n请基于以上完整上下文生成一部短篇小说，创建 4 到 6 个章节。每章需要有明确标题和完整正文。`,
      });

      setFinalNovel(content);
    } catch (error) {
      setFinalError(getErrorMessage(error));
    } finally {
      setIsGeneratingNovel(false);
    }
  }

  return (
    <main className="planner-shell">
      <section className="planner-hero">
        <p className="brand-kicker">AI Novel Planner</p>
        <h1>用四步把一句话扩展成可生成小说的完整上下文</h1>
        <p>
          先写下故事核心，再让大模型逐步生成角色与情节、世界观、整体文笔风格。每一步结果都会进入最终小说生成上下文。
        </p>
      </section>

      <section className="planner-board">
        <aside className="planner-steps" aria-label="小说生成步骤">
          <StepButton
            index={0}
            isActive={activeIndex === 0}
            isComplete={Boolean(premise.trim())}
            label="一句话故事"
            onClick={() => setActiveIndex(0)}
          />
          <StepButton
            index={1}
            isActive={activeIndex === 1}
            isComplete={Boolean(steps.characters_plot.content)}
            label="角色和情节"
            onClick={() => setActiveIndex(1)}
          />
          <StepButton
            index={2}
            isActive={activeIndex === 2}
            isComplete={Boolean(steps.worldview.content)}
            label="小说世界观"
            onClick={() => setActiveIndex(2)}
          />
          <StepButton
            index={3}
            isActive={activeIndex === 3}
            isComplete={Boolean(steps.style.content)}
            label="整体风格"
            onClick={() => setActiveIndex(3)}
          />
        </aside>

        <div className="planner-main">
          {activeIndex === 0 && (
            <section className="planner-card">
              <div className="planner-card-header">
                <span>Step 1</span>
                <h2>一句话说出故事内容</h2>
                <p>这句话会作为后续所有 AI 生成步骤的源头，尽量写清主角、目标和核心冲突。</p>
              </div>
              <textarea
                className="premise-input"
                onChange={(event) => setPremise(event.target.value)}
                placeholder="例：一个失去记忆的快递员，在末日城市里发现自己每天送出的包裹都在改写世界规则。"
                value={premise}
              />
              <div className="planner-actions">
                <button disabled={!canGenerateCharacters} onClick={() => setActiveIndex(1)} type="button">
                  下一步
                </button>
              </div>
            </section>
          )}

          {activeIndex === 1 && (
            <GeneratedStepCard
              canGenerate={canGenerateCharacters}
              description={generatedStepDescriptions.characters_plot}
              index={2}
              onGenerate={() => void generateStep("characters_plot")}
              step={steps.characters_plot}
              title={generatedStepLabels.characters_plot}
            />
          )}

          {activeIndex === 2 && (
            <GeneratedStepCard
              canGenerate={canGenerateWorldview}
              description={generatedStepDescriptions.worldview}
              index={3}
              onGenerate={() => void generateStep("worldview")}
              step={steps.worldview}
              title={generatedStepLabels.worldview}
            />
          )}

          {activeIndex === 3 && (
            <GeneratedStepCard
              canGenerate={canGenerateStyle}
              description={generatedStepDescriptions.style}
              index={4}
              onGenerate={() => void generateStep("style")}
              step={steps.style}
              title={generatedStepLabels.style}
            />
          )}
        </div>

        <aside className="planner-context">
          <h2>最终上下文</h2>
          <p>这里汇总前四步结果，最终小说生成会完整携带这些内容。</p>
          <div className="context-preview">{contextSummary}</div>
          <button disabled={!canGenerateNovel || isGeneratingNovel} onClick={() => void generateFinalNovel()} type="button">
            {isGeneratingNovel ? "生成小说中..." : "基于上下文生成最终小说"}
          </button>
          {finalError && <p className="planner-error">{finalError}</p>}
          {finalNovel && <pre className="final-novel-output">{finalNovel}</pre>}
        </aside>
      </section>
    </main>
  );
}

function StepButton({
  index,
  isActive,
  isComplete,
  label,
  onClick,
}: {
  index: number;
  isActive: boolean;
  isComplete: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`planner-step ${isActive ? "active" : ""}`} onClick={onClick} type="button">
      <span>{index + 1}</span>
      <strong>{label}</strong>
      <small>{isComplete ? "已完成" : "待生成"}</small>
    </button>
  );
}

function GeneratedStepCard({
  canGenerate,
  description,
  index,
  onGenerate,
  step,
  title,
}: {
  canGenerate: boolean;
  description: string;
  index: number;
  onGenerate: () => void;
  step: StepState;
  title: string;
}) {
  const hasContent = Boolean(step.content);

  return (
    <section className="planner-card">
      <div className="planner-card-header">
        <span>Step {index}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={`generated-box ${hasContent ? "filled" : ""}`}>
        {step.isLoading && "AI 正在生成..."}
        {!step.isLoading && hasContent && step.content}
        {!step.isLoading && !hasContent && "点击生成后，这里会出现可用于最终小说生成的上下文。"}
      </div>
      {step.error && <p className="planner-error">{step.error}</p>}
      <div className="planner-actions">
        <button disabled={!canGenerate || step.isLoading} onClick={onGenerate} type="button">
          {hasContent ? "重试生成" : "生成"}
        </button>
      </div>
    </section>
  );
}
