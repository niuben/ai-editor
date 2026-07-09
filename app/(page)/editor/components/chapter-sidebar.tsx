import type { Chapter } from "../../../lib/types";

type ChapterSidebarProps = {
  chapters: Chapter[];
  activeChapterId: string;
  onSelectChapter: (chapterId: string) => void;
  onAddChapter: () => void;
};

export function ChapterSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
}: ChapterSidebarProps) {
  return (
    <aside className="panel chapters">
      <div className="brand">
        <p className="brand-kicker">AI Writer</p>
        <h1>章节</h1>
      </div>

      <p className="section-label">Chapter List</p>
      <ul className="chapter-list">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <button
              className={`chapter-button ${chapter.id === activeChapterId ? "active" : ""}`}
              onClick={() => onSelectChapter(chapter.id)}
              type="button"
            >
              <span className="chapter-title">{chapter.title || "未命名章节"}</span>
              <span className="chapter-meta">第 {index + 1} 章</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="add-chapter" onClick={onAddChapter} type="button">
        + 添加章节
      </button>
    </aside>
  );
}
