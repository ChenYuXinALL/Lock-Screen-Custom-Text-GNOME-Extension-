import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LockScreenCustomTextPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        // 文字内容组
        const group = new Adw.PreferencesGroup({ title: _('Text Content') });
        const textRow = new Adw.EntryRow({
            title: _('Text'),
            text: settings.get_string('custom-text')
        });
        textRow.connect('changed', (e) => settings.set_string('custom-text', e.text));
        group.add(textRow);
        page.add(group);

        // 行为控制组
        const behaviorGroup = new Adw.PreferencesGroup({ title: _('Behavior') });
        
        const fixedRow = new Adw.SwitchRow({
            title: _('Fixed Mode'),
            subtitle: _('Stationary relative to screen (Fixes jumping issues)'),
            active: settings.get_boolean('fixed-mode')
        });
        fixedRow.connect('notify::active', (s) => settings.set_boolean('fixed-mode', s.active));
        behaviorGroup.add(fixedRow);
        
        page.add(behaviorGroup);

        // 外观组
        const appearanceGroup = new Adw.PreferencesGroup({ title: _('Appearance') });
        
        // 字体大小
        const sizeRow = new Adw.SpinRow({
            title: _('Font Size'),
            adjustment: new Gtk.Adjustment({ lower: 1, upper: 500, value: settings.get_int('font-size'), step_increment: 1 })
        });
        sizeRow.connect('notify::value', (s) => settings.set_int('font-size', s.value));
        appearanceGroup.add(sizeRow);

        // 颜色选择器函数
        const addColor = (title, key) => {
            const row = new Adw.ActionRow({ title });
            const btn = new Gtk.ColorDialogButton({ dialog: new Gtk.ColorDialog(), valign: Gtk.Align.CENTER });
            const rgba = new Gdk.RGBA();
            rgba.parse(settings.get_string(key));
            btn.set_rgba(rgba);
            btn.connect('notify::rgba', () => {
                const c = btn.rgba;
                settings.set_string(key, `rgba(${c.red*255},${c.green*255},${c.blue*255},${c.alpha})`);
            });
            row.add_suffix(btn);
            appearanceGroup.add(row);
        };

        addColor(_('Text Color'), 'font-color');
        
        // 阴影开关
        const shadowRow = new Adw.SwitchRow({ title: _('Text Shadow'), active: settings.get_boolean('enable-shadow') });
        shadowRow.connect('notify::active', (s) => settings.set_boolean('enable-shadow', s.active));
        appearanceGroup.add(shadowRow);
        
        page.add(appearanceGroup);

        // 位置组
        const posGroup = new Adw.PreferencesGroup({ title: _('Position Offset') });
        const addPos = (title, key) => {
            const row = new Adw.SpinRow({
                title,
                adjustment: new Gtk.Adjustment({ lower: -2000, upper: 2000, value: settings.get_int(key), step_increment: 5 })
            });
            row.connect('notify::value', (s) => settings.set_int(key, s.value));
            posGroup.add(row);
        };
        addPos(_('Horizontal Offset (X)'), 'pos-x');
        addPos(_('Vertical Offset (Y)'), 'pos-y');
        page.add(posGroup);

        window.add(page);
    }
}