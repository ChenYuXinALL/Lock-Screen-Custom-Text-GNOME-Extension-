import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as UnlockDialogModule from 'resource:///org/gnome/shell/ui/unlockDialog.js';

// Constants replicated from unlockDialog.js to ensure perfect sync
const FADE_OUT_TRANSLATION = 200;
const FADE_OUT_SCALE = 0.3;

const UnlockDialog = UnlockDialogModule.UnlockDialog;

// Custom Label Class
const CustomLockLabel = GObject.registerClass(
class CustomLockLabel extends St.Label {
    _init(settings) {
        super._init({
            style_class: 'custom-lock-label',
            text: '',
            x_expand: true,
            y_expand: true,
        });
        
        this._settings = settings;
        this._settingsChangedId = this._settings.connect('changed', this._updateStyleAndPos.bind(this));
        
        this._updateStyleAndPos();
    }

    _updateStyleAndPos() {
        // 1. Update Text
        this.text = this._settings.get_string('text-content');

        // 2. Update CSS Style
        const fontSize = this._settings.get_int('font-size');
        const color = this._settings.get_string('font-color');
        const hasShadow = this._settings.get_boolean('enable-shadow');
        
        let style = `font-size: ${fontSize}px; color: ${color};`;
        
        if (hasShadow) {
            const sColor = this._settings.get_string('shadow-color');
            const sX = this._settings.get_int('shadow-x');
            const sY = this._settings.get_int('shadow-y');
            style += ` text-shadow: ${sX}px ${sY}px ${sColor};`;
        }

        this.style = style;

        // 3. Update Position (Alignment + Offset)
        const preset = this._settings.get_string('position-preset');
        const offX = this._settings.get_int('offset-x');
        const offY = this._settings.get_int('offset-y');

        // Set Alignment based on preset
        switch(preset) {
            case 'top-left':
                this.x_align = Clutter.ActorAlign.START;
                this.y_align = Clutter.ActorAlign.START;
                break;
            case 'top-center':
                this.x_align = Clutter.ActorAlign.CENTER;
                this.y_align = Clutter.ActorAlign.START;
                break;
            case 'top-right':
                this.x_align = Clutter.ActorAlign.END;
                this.y_align = Clutter.ActorAlign.START;
                break;
            case 'bottom-left':
                this.x_align = Clutter.ActorAlign.START;
                this.y_align = Clutter.ActorAlign.END;
                break;
            case 'bottom-center':
                this.x_align = Clutter.ActorAlign.CENTER;
                this.y_align = Clutter.ActorAlign.END;
                break;
            case 'bottom-right':
                this.x_align = Clutter.ActorAlign.END;
                this.y_align = Clutter.ActorAlign.END;
                break;
            default: // center
                this.x_align = Clutter.ActorAlign.CENTER;
                this.y_align = Clutter.ActorAlign.CENTER;
        }

        // Apply Manual Offsets via Translation
        // We use a base translation that we might animate later, so we store the "base"
        this._baseTranslationX = offX;
        this._baseTranslationY = offY;
        
        // Apply immediately for now
        this.translation_x = this._baseTranslationX;
        this.translation_y = this._baseTranslationY;
    }

    destroy() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
        }
        super.destroy();
    }
});

export default class LockScreenCustomTextExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        
        // Store original methods to unpatch later
        this._origInit = UnlockDialog.prototype._init;
        this._origSetTransitionProgress = UnlockDialog.prototype._setTransitionProgress;

        const extSelf = this;

        // Patch _init to inject our label
        UnlockDialog.prototype._init = function(parentActor) {
            // Call original init
            extSelf._origInit.call(this, parentActor);

            // Create and add our label
            this._customTextLabel = new CustomLockLabel(extSelf._settings);
            
            // We add it to the instance. UnlockDialog is a St.Widget.
            // UnlockDialogLayout handles specific children (_stack, _notifications), 
            // but standard Clutter children usually sit on top if unmanaged.
            this.add_child(this._customTextLabel);
            
            // Ensure it is visually above the background but below auth prompt
            // The auth prompt is in `this._stack`.
            this.set_child_below_sibling(this._customTextLabel, this._stack);
        };

        // Patch _setTransitionProgress to handle animation
        UnlockDialog.prototype._setTransitionProgress = function(progress) {
            // Call original
            extSelf._origSetTransitionProgress.call(this, progress);

            if (!this._customTextLabel) return;

            const mode = extSelf._settings.get_string('animation-mode');

            if (mode === 'animate') {
                // Mimic the logic from unlockDialog.js for the clock
                // The clock fades out and scales down as progress goes 0 -> 1
                
                const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                
                // Logic derived from unlockDialog.js provided in prompt:
                // opacity: 255 * (1 - progress)
                // scale: FADE_OUT_SCALE + (1 - FADE_OUT_SCALE) * (1 - progress)
                // translation_y: -FADE_OUT_TRANSLATION * progress * scaleFactor
                
                this._customTextLabel.opacity = 255 * (1 - progress);
                
                const scale = FADE_OUT_SCALE + (1 - FADE_OUT_SCALE) * (1 - progress);
                this._customTextLabel.scale_x = scale;
                this._customTextLabel.scale_y = scale;
                
                // Add the animation translation TO the user's manual offset
                const animTransY = -FADE_OUT_TRANSLATION * progress * scaleFactor;
                
                this._customTextLabel.translation_y = this._customTextLabel._baseTranslationY + animTransY;

            } else {
                // Fixed Mode
                // We reset properties in case we switched modes live
                this._customTextLabel.opacity = 255; 
                this._customTextLabel.scale_x = 1;
                this._customTextLabel.scale_y = 1;
                this._customTextLabel.translation_y = this._customTextLabel._baseTranslationY;
                
                // Optional: You might want to fade it out slightly so it doesn't block the password prompt
                // If you want it TRULY fixed (visible over password), leave opacity at 255.
                // If you want it fixed in place but disappearing, uncomment below:
                // this._customTextLabel.opacity = 255 * (1 - progress);
            }
        };

        // If the screen is ALREADY locked when we enable (dev scenario), inject immediately
        if (Main.screenShield && Main.screenShield._dialog) {
            const dialog = Main.screenShield._dialog;
            if (!dialog._customTextLabel) {
                dialog._customTextLabel = new CustomLockLabel(this._settings);
                dialog.add_child(dialog._customTextLabel);
                dialog.set_child_below_sibling(dialog._customTextLabel, dialog._stack);
            }
        }
    }

    disable() {
        // Restore original methods
        if (this._origInit) {
            UnlockDialog.prototype._init = this._origInit;
            this._origInit = null;
        }

        if (this._origSetTransitionProgress) {
            UnlockDialog.prototype._setTransitionProgress = this._origSetTransitionProgress;
            this._origSetTransitionProgress = null;
        }

        // Clean up existing label if lock screen is active
        if (Main.screenShield && Main.screenShield._dialog) {
            const dialog = Main.screenShield._dialog;
            if (dialog._customTextLabel) {
                dialog._customTextLabel.destroy();
                dialog._customTextLabel = null;
            }
        }

        this._settings = null;
    }
}