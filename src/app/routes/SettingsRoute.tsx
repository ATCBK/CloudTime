import { SettingsPage } from "../../components/SettingsPage";
import { useSettingsStore } from "../../stores/useSettingsStore";

export function SettingsRoute(): JSX.Element {
  const settings = useSettingsStore((state) => state.settings);
  const patchSettings = useSettingsStore((state) => state.patchSettings);

  return (
    <SettingsPage
      settings={settings}
      onOpacityChange={(value) => patchSettings({ opacity: value })}
      onQuickPanelOpacityChange={(value) => patchSettings({ quickPanelOpacity: value })}
      onThemeModeChange={(mode) => patchSettings({ themeMode: mode })}
      onHotkeysChange={async (quickPanelHotkey, quickCreateTodoHotkey) => {
        const result = await window.cloudo.setDynamicHotkeys({
          toggleQuickPanel: quickPanelHotkey,
          quickCreateTodo: quickCreateTodoHotkey
        });

        if (result.ok) {
          patchSettings({
            quickPanelHotkey,
            quickCreateTodoHotkey
          });
        }

        return result;
      }}
    />
  );
}
