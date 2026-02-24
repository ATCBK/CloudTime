import { AppPage } from "../types";

interface SidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

type NavItem = {
  page: AppPage;
  label: string;
  social: "time-todo" | "notes" | "settings";
};

const TOP_ITEMS: NavItem[] = [
  { page: "time_manager", label: "时间待办", social: "time-todo" },
  { page: "notes", label: "笔记", social: "notes" }
];

const BOTTOM_ITEM: NavItem = { page: "settings", label: "设置", social: "settings" };

function Icon({ social }: { social: NavItem["social"] }): JSX.Element {
  if (social === "time-todo") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="9" r="5.5" />
        <path d="M9 6.5v3l2 1.5" />
        <path d="M14.5 14.5l1.7 1.7 3.3-3.3" />
        <path d="M16 4h4" />
      </svg>
    );
  }
  if (social === "notes") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h8l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
        <path d="M15 3.5V8h4M9 12h6M9 15.5h6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.5 12a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7.8 7.8 0 0 0-1.7-1l-.4-2.5H11l-.4 2.5a7.8 7.8 0 0 0-1.7 1l-2.4-.8-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.4-.8a7.8 7.8 0 0 0 1.7 1L11 21h4l.4-2.5a7.8 7.8 0 0 0 1.7-1l2.4.8 2-3.5-2-1.5c.1-.3.1-.7.1-1z" />
    </svg>
  );
}

function QuickActionIcon({ type }: { type: "quick-panel" | "quick-create" }): JSX.Element {
  if (type === "quick-panel") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="3" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
      <circle cx="12" cy="12" r="8.2" />
    </svg>
  );
}

function renderNavItem(item: NavItem, activePage: AppPage, onNavigate: (page: AppPage) => void): JSX.Element {
  const activeClass = activePage === item.page ? "nav-link active" : "nav-link";
  return (
    <div key={item.page} className="icon-content">
      <button type="button" className={activeClass} data-social={item.social} aria-label={item.label} onClick={() => onNavigate(item.page)}>
        <span className="filled" />
        <Icon social={item.social} />
      </button>
      <div className="tooltip">{item.label}</div>
    </div>
  );
}

export function Sidebar({ activePage, onNavigate }: SidebarProps): JSX.Element {
  const openQuickPanel = (): void => {
    void window.cloudo.toggleQuickPanelWindow();
  };

  const focusQuickCreate = (): void => {
    onNavigate("time_manager");
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("cloudo:focusQuickCreate"));
    }, 40);
  };

  return (
    <aside className="sidebar" aria-label="侧边导航">
      <div className="sidebar-brand" aria-hidden="true">
        <span className="brand-mark">C</span>
      </div>

      <div className="sidebar-main" role="group" aria-label="主导航">
        {TOP_ITEMS.map((item) => renderNavItem(item, activePage, onNavigate))}
      </div>

      <div className="sidebar-divider" aria-hidden="true" />

      <div className="sidebar-actions" role="group" aria-label="快捷操作">
        <div className="icon-content">
          <button type="button" className="quick-action-btn" aria-label="快捷浮窗" onClick={openQuickPanel}>
            <QuickActionIcon type="quick-panel" />
          </button>
          <div className="tooltip">快捷浮窗</div>
        </div>
        <div className="icon-content">
          <button type="button" className="quick-action-btn" aria-label="快速新建" onClick={focusQuickCreate}>
            <QuickActionIcon type="quick-create" />
          </button>
          <div className="tooltip">快速新建</div>
        </div>
      </div>

      <div className="bottom">{renderNavItem(BOTTOM_ITEM, activePage, onNavigate)}</div>
    </aside>
  );
}
