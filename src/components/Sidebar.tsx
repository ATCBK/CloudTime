import { AppPage } from "../types";
import brandLogo from "../../etc/云朵(1).png";

interface SidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: Array<{ page: AppPage; label: string; icon: string }> = [
  { page: "time_manager", label: "时间管理", icon: "⏱" },
  { page: "notes", label: "笔记", icon: "🗂" },
  { page: "settings", label: "设置", icon: "⚙" }
];

export function Sidebar({ activePage, onNavigate, collapsed, onToggleCollapse }: SidebarProps): JSX.Element {
  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-head">
        <div className="brand" aria-label="Cloudo">
          <img src={brandLogo} alt="Cloudo" className={collapsed ? "brand-logo compact" : "brand-logo"} />
          {!collapsed ? <span className="brand-text">Cloudo</span> : null}
        </div>
        <button className="collapse-btn" type="button" onClick={onToggleCollapse} title="折叠或展开侧边栏">
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.page}
            className={activePage === item.page ? "nav-item active" : "nav-item"}
            onClick={() => onNavigate(item.page)}
            type="button"
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className={collapsed ? "nav-label hidden" : "nav-label"}>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
