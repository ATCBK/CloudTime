interface ExplosiveCardItem {
  id: string;
  title: string;
  meta?: string;
  details?: string;
  completed: boolean;
}

interface ExplosiveGrowthCardProps {
  title: string;
  items: ExplosiveCardItem[];
  emptyText: string;
  completeAllText?: string;
  completeAllDoneText?: string;
  onToggleItem: (id: string) => void;
  onCompleteAll?: () => void;
}

const CHECK_PATH =
  "M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z";

export function ExplosiveGrowthCard({
  title,
  items,
  emptyText,
  completeAllText = "一键全部完成",
  completeAllDoneText = "已全部完成",
  onToggleItem,
  onCompleteAll
}: ExplosiveGrowthCardProps): JSX.Element {
  const allDone = items.length > 0 && items.every((item) => item.completed);

  return (
    <article className="explosive-card" role="region" aria-label={title}>
      <div className="explosive-card__border" />
      <header className="explosive-card__brand">{title}</header>
      <hr className="explosive-card__line" />

      <ul className="explosive-card__list">
        {items.length === 0 ? <li className="explosive-card__empty">{emptyText}</li> : null}
        {items.map((item) => (
          <li key={item.id} className={item.completed ? "explosive-card__item done" : "explosive-card__item"}>
            <button type="button" className="explosive-card__check" onClick={() => onToggleItem(item.id)} title="切换完成状态">
              <svg viewBox="0 0 16 16" fill="currentColor" className="explosive-card__check-svg" aria-hidden>
                <path fillRule="evenodd" clipRule="evenodd" d={CHECK_PATH} />
              </svg>
            </button>
            <div className="explosive-card__main">
              <span className="explosive-card__text">{item.title}</span>
              {item.meta ? <span className="explosive-card__meta">{item.meta}</span> : null}
              {item.details ? <span className="explosive-card__detail">{item.details}</span> : null}
            </div>
          </li>
        ))}
      </ul>

      <button type="button" className="explosive-card__button" onClick={onCompleteAll} disabled={!onCompleteAll || items.length === 0 || allDone}>
        {allDone ? completeAllDoneText : completeAllText}
      </button>
    </article>
  );
}

