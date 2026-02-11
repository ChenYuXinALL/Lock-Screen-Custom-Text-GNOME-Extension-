import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LockScreenCustomTextPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: _('Text Settings') });
        page.add(group);

        // Text Content
        const textRow = new Adw.EntryRow({
            title: _('Text Content'),
            text: settings.get_string('text-content')
        });
        textRow.connect('changed', (entry) => {
            settings.set_string('text-content', entry.text);
        });
        group.add(textRow);

        // Font Size
        const sizeRow = new Adw.SpinRow({
            title: _('Font Size (px)'),
            adjustment: new Gtk.Adjustment({ lower: 10, upper: 200, step_increment: 1 }),
            value: settings.get_int('font-size')
        });
        sizeRow.connect('notify::value', (spin) => {
            settings.set_int('font-size', spin.value);
        });
        group.add(sizeRow);

        // Font Color
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
        group.add(colorRow);

        // Behavior Group
        const behaviorGroup = new Adw.PreferencesGroup({ title: _('Behavior & Position') });
        page.add(behaviorGroup);

        // Animation Mode
        const modeRow = new Adw.ComboRow({
            title: _('Animation Mode'),
            model: new Gtk.StringList({ strings: ['animate', 'fixed'] }),
            selected: settings.get_string('animation-mode') === 'fixed' ? 1 : 0
        });
        modeRow.connect('notify::selected', (combo) => {
            settings.set_string('animation-mode', combo.selected === 1 ? 'fixed' : 'animate');
        });
        behaviorGroup.add(modeRow);

        // Position Preset
        const presets = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
        const presetRow = new Adw.ComboRow({
            title: _('Position Preset'),
            model: new Gtk.StringList({ strings: presets }),
        });
        
        // Find current index
        let currentPreset = settings.get_string('position-preset');
        let index = presets.indexOf(currentPreset);
        if (index === -1) index = 1; // default top-center
        presetRow.selected = index;

        presetRow.connect('notify::selected', (combo) => {
            settings.set_string('position-preset', presets[combo.selected]);
        });
        behaviorGroup.add(presetRow);

        // Offsets
        const xOffsetRow = new Adw.SpinRow({
            title: _('Offset X (px)'),
            adjustment: new Gtk.Adjustment({ lower: -1000, upper: 1000, step_increment: 1 }),
            value: settings.get_int('offset-x')
        });
        xOffsetRow.connect('notify::value', (spin) => {
            settings.set_int('offset-x', spin.value);
        });
        behaviorGroup.add(xOffsetRow);

        const yOffsetRow = new Adw.SpinRow({
            title: _('Offset Y (px)'),
            adjustment: new Gtk.Adjustment({ lower: -1000, upper: 1000, step_increment: 1 }),
            value: settings.get_int('offset-y')
        });
        yOffsetRow.connect('notify::value', (spin) => {
            settings.set_int('offset-y', spin.value);
        });
        behaviorGroup.add(yOffsetRow);

        // Shadow Group
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
            title: _('Shadow X'),
            adjustment: new Gtk.Adjustment({ lower: -50, upper: 50, step_increment: 1 }),
            value: settings.get_int('shadow-x')
        });
        sxRow.connect('notify::value', (spin) => settings.set_int('shadow-x', spin.value));
        shadowGroup.add(sxRow);

        const syRow = new Adw.SpinRow({
            title: _('Shadow Y'),
            adjustment: new Gtk.Adjustment({ lower: -50, upper: 50, step_increment: 1 }),
            value: settings.get_int('shadow-y')
        });
        syRow.connect('notify::value', (spin) => settings.set_int('shadow-y', spin.value));
        shadowGroup.add(syRow);

        window.add(page);
    }
}