import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LockScreenCustomTextPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: _('Text Settings') });
        const layoutGroup = new Adw.PreferencesGroup({ title: _('Layout & Appearance') });

        // Custom Text Input
        const textRow = new Adw.EntryRow({
            title: _('Custom Text'),
            text: settings.get_string('custom-text')
        });
        textRow.connect('changed', (entry) => {
            settings.set_string('custom-text', entry.text);
        });
        group.add(textRow);

        // Fixed Position Mode (New Switch)
        const fixedModeRow = new Adw.SwitchRow({
            title: _('Fixed Position Mode'),
            subtitle: _('Keep text stationary when unlocking (does not fade out with clock)'),
            active: settings.get_boolean('fixed-mode')
        });
        fixedModeRow.connect('notify::active', (sw) => {
            settings.set_boolean('fixed-mode', sw.active);
        });
        group.add(fixedModeRow);

        // Font Size
        const sizeRow = new Adw.SpinRow({
            title: _('Font Size'),
            adjustment: new Gtk.Adjustment({
                lower: 8,
                upper: 120,
                step_increment: 1,
                value: settings.get_int('font-size')
            })
        });
        sizeRow.connect('notify::value', (spin) => {
            settings.set_int('font-size', spin.value);
        });
        group.add(sizeRow);

        // Position X
        const posXRow = new Adw.SpinRow({
            title: _('Offset X (Horizontal)'),
            adjustment: new Gtk.Adjustment({
                lower: -1000,
                upper: 1000,
                step_increment: 10,
                value: settings.get_int('pos-x')
            })
        });
        posXRow.connect('notify::value', (spin) => {
            settings.set_int('pos-x', spin.value);
        });
        layoutGroup.add(posXRow);

        // Position Y
        const posYRow = new Adw.SpinRow({
            title: _('Offset Y (Vertical)'),
            adjustment: new Gtk.Adjustment({
                lower: -1000,
                upper: 1000,
                step_increment: 10,
                value: settings.get_int('pos-y')
            })
        });
        posYRow.connect('notify::value', (spin) => {
            settings.set_int('pos-y', spin.value);
        });
        layoutGroup.add(posYRow);

        // Helper for Color Dialogs
        const createColorRow = (title, key) => {
            const row = new Adw.ActionRow({ title: title });
            const colorButton = new Gtk.ColorDialogButton({
                valign: Gtk.Align.CENTER,
                dialog: new Gtk.ColorDialog()
            });

            // Set initial color
            const rgba = new Gdk.RGBA();
            rgba.parse(settings.get_string(key));
            colorButton.set_rgba(rgba);

            colorButton.connect('notify::rgba', () => {
                const c = colorButton.get_rgba();
                const cssColor = `rgba(${Math.floor(c.red * 255)}, ${Math.floor(c.green * 255)}, ${Math.floor(c.blue * 255)}, ${c.alpha.toFixed(2)})`;
                settings.set_string(key, cssColor);
            });

            row.add_suffix(colorButton);
            return row;
        };

        // Font Color
        layoutGroup.add(createColorRow(_('Font Color'), 'font-color'));

        // Shadow Switch
        const shadowRow = new Adw.SwitchRow({
            title: _('Enable Shadow'),
            active: settings.get_boolean('enable-shadow')
        });
        shadowRow.connect('notify::active', (sw) => {
            settings.set_boolean('enable-shadow', sw.active);
        });
        layoutGroup.add(shadowRow);

        // Shadow Color
        layoutGroup.add(createColorRow(_('Shadow Color'), 'shadow-color'));

        page.add(group);
        page.add(layoutGroup);
        window.add(page);
    }
}