import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as UnlockDialog from 'resource:///org/gnome/shell/ui/unlockDialog.js';

export default class LockScreenCustomTextExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._originalInit = UnlockDialog.UnlockDialog.prototype._init;
        const ext = this;

        // Monkey-patch the UnlockDialog _init method
        UnlockDialog.UnlockDialog.prototype._init = function(parentActor) {
            // Call the original constructor first
            ext._originalInit.call(this, parentActor);

            // Create our custom label
            this._customTextLabel = new St.Label({
                style_class: 'unlock-dialog-custom-text',
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });

            // Helper to update style, content AND parent
            this._updateCustomText = () => {
                const text = ext._settings.get_string('custom-text');
                const size = ext._settings.get_int('font-size');
                const color = ext._settings.get_string('font-color');
                const shadow = ext._settings.get_boolean('enable-shadow');
                const shadowColor = ext._settings.get_string('shadow-color');
                const posX = ext._settings.get_int('pos-x');
                const posY = ext._settings.get_int('pos-y');
                const fixedMode = ext._settings.get_boolean('fixed-mode');

                // 1. Logic to switch parent (Fixed Mode vs Moving Mode)
                // If fixedMode is true, we attach to 'this._stack' (which stays put).
                // If fixedMode is false, we attach to 'this._clock' (which animates/fades out).
                let desiredParent = fixedMode ? this._stack : this._clock;
                
                // Safety check: ensure parent exists
                if (desiredParent) {
                    let currentParent = this._customTextLabel.get_parent();
                    if (currentParent !== desiredParent) {
                        if (currentParent) {
                            currentParent.remove_child(this._customTextLabel);
                        }
                        desiredParent.add_child(this._customTextLabel);
                    }
                } else {
                    console.warn('[LockScreenCustomText] Desired parent (Stack or Clock) not found.');
                }

                // 2. Update Content and Style
                this._customTextLabel.set_text(text);
                
                let style = `font-size: ${size}px; color: ${color};`;
                if (shadow) {
                    style += ` text-shadow: 2px 2px 4px ${shadowColor};`;
                }
                this._customTextLabel.set_style(style);

                // 3. Update Position
                // Clutter translation works relative to the parent's center (due to alignment)
                this._customTextLabel.set_translation(posX, posY, 0);
            };

            // Initial update
            this._updateCustomText();

            // Connect settings changes
            ext._settings.connectObject(
                'changed::custom-text', this._updateCustomText,
                'changed::font-size', this._updateCustomText,
                'changed::font-color', this._updateCustomText,
                'changed::enable-shadow', this._updateCustomText,
                'changed::shadow-color', this._updateCustomText,
                'changed::pos-x', this._updateCustomText,
                'changed::pos-y', this._updateCustomText,
                'changed::fixed-mode', this._updateCustomText, // Listen for the new switch
                this._customTextLabel // Lifecycle managed by the label actor
            );
        };
    }

    disable() {
        // Revert the monkey patch
        if (this._originalInit) {
            UnlockDialog.UnlockDialog.prototype._init = this._originalInit;
            this._originalInit = null;
        }

        this._settings = null;
    }
}