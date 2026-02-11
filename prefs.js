import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LockScreenCustomTextPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        // 1. 内容与外观组
        const contentGroup = new Adw.PreferencesGroup({ title: _('Content & Appearance') });
        page.add(contentGroup);

        // 文本内容
        const textRow = new Adw.EntryRow({
            title: _('Custom Text'),
            text: settings.get_string('custom-text')
        });
        textRow.connect('changed', (entry) => {
            settings.set_string('custom-text', entry.text);
        });
        contentGroup.add(textRow);

        // 字体大小
        const sizeRow = new Adw.SpinRow({
            title: _('Font Size (px)'),
            adjustment: new Gtk.Adjustment({ lower: 8, upper: 200, step_increment: 1 }),
            value: settings.get_int('font-size')
        });
        sizeRow.connect('notify::value', (spin) => {
            settings.set_int('font-size', spin.value);
        });
        contentGroup.add(sizeRow);

        // 字体颜色
        const colorRow = new Adw.ActionRow({ title: _('Font Color') });
        const colorBtn = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog(),
            rgba: new Gdk.RGBA()
        });
        colorBtn.rgba.parse(settings.get_string('font-color'));
        colorBtn.connect('notify::rgba', (btn) => {
            settings.set_string('font-color', btn.rgba.to_string());
        });
        colorRow.add_suffix(colorBtn);
        contentGroup.add(colorRow);

        // 2. 行为与位置组
        const behaviorGroup = new Adw.PreferencesGroup({ title: _('Behavior & Position') });
        page.add(behaviorGroup);

        // 固定模式开关
        const fixedRow = new Adw.SwitchRow({
            title: _('Fixed Position Mode'),
            subtitle: _('If enabled, text stays in place. If disabled, it moves with the clock animation.'),
            active: settings.get_boolean('fixed-mode')
        });
        fixedRow.connect('notify::active', (sw) => {
            settings.set_boolean('fixed-mode', sw.active);
        });
        behaviorGroup.add(fixedRow);

        // 位置预设 (GUI Selection)
        const presets = ['top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right'];
        const presetRow = new Adw.ComboRow({
            title: _('Position Preset'),
            model: new Gtk.StringList({ strings: presets }),
        });
        
        // 查找当前索引
        let currentPreset = settings.get_string('position-preset');
        let index = presets.indexOf(currentPreset);
        if (index === -1) index = 1; // default top-center
        presetRow.selected = index;

        presetRow.connect('notify::selected', (combo) => {
            settings.set_string('position-preset', presets[combo.selected]);
        });
        behaviorGroup.add(presetRow);

        // 偏移调节
        const xRow = new Adw.SpinRow({
            title: _('Offset X (px)'),
            subtitle: _('Fine-tune horizontal position'),
            adjustment: new Gtk.Adjustment({ lower: -1000, upper: 1000, step_increment: 1 }),
            value: settings.get_int('pos-x')
        });
        xRow.connect('notify::value', (spin) => settings.set_int('pos-x', spin.value));
        behaviorGroup.add(xRow);

        const yRow = new Adw.SpinRow({
            title: _('Offset Y (px)'),
            subtitle: _('Fine-tune vertical position'),
            adjustment: new Gtk.Adjustment({ lower: -1000, upper: 1000, step_increment: 1 }),
            value: settings.get_int('pos-y')
        });
        yRow.connect('notify::value', (spin) => settings.set_int('pos-y', spin.value));
        behaviorGroup.add(yRow);

        // 3. 阴影设置组
        const shadowGroup = new Adw.PreferencesGroup({ title: _('Shadow Settings') });
        page.add(shadowGroup);

        const enableShadowRow = new Adw.SwitchRow({
            title: _('Enable Shadow'),
            active: settings.get_boolean('enable-shadow')
        });
        enableShadowRow.connect('notify::active', (sw) => {
            settings.set_boolean('enable-shadow', sw.active);
        });
        shadowGroup.add(enableShadowRow);

        const shadowColorRow = new Adw.ActionRow({ title: _('Shadow Color') });
        const shadowColorBtn = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog(),
            rgba: new Gdk.RGBA()
        });
        shadowColorBtn.rgba.parse(settings.get_string('shadow-color'));
        shadowColorBtn.connect('notify::rgba', (btn) => {
            settings.set_string('shadow-color', btn.rgba.to_string());
        });
        shadowColorRow.add_suffix(shadowColorBtn);
        shadowGroup.add(shadowColorRow);

        const sxRow = new Adw.SpinRow({
            title: _('Shadow Offset X'),
            adjustment: new Gtk.Adjustment({ lower: -50, upper: 50, step_increment: 1 }),
            value: settings.get_int('shadow-x')
        });
        sxRow.connect('notify::value', (spin) => settings.set_int('shadow-x', spin.value));
        shadowGroup.add(sxRow);

        const syRow = new Adw.SpinRow({
            title: _('Shadow Offset Y'),
            adjustment: new Gtk.Adjustment({ lower: -50, upper: 50, step_increment: 1 }),
            value: settings.get_int('shadow-y')
        });
        syRow.connect('notify::value', (spin) => settings.set_int('shadow-y', spin.value));
        shadowGroup.add(syRow);

        window.add(page);
    }
}