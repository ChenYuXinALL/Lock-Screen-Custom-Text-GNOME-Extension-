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

        // 1. Hook 构造函数以捕获 parentActor 并注入标签
        UnlockDialog.UnlockDialog.prototype._init = function(parentActor) {
            this._customTextParent = parentActor; // 锁屏根容器
            ext._originalInit.call(this, parentActor);

            this._customTextLabel = new St.Label({
                style_class: 'unlock-dialog-custom-text',
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true
            });

            this._updateCustomText = () => {
                if (!this._customTextLabel) return;
                
                const fixedMode = ext._settings.get_boolean('fixed-mode');
                const text = ext._settings.get_string('custom-text');
                const size = ext._settings.get_int('font-size');
                const color = ext._settings.get_string('font-color');
                const shadow = ext._settings.get_boolean('enable-shadow');
                const shadowColor = ext._settings.get_string('shadow-color');
                const posX = ext._settings.get_int('pos-x');
                const posY = ext._settings.get_int('pos-y');

                // 修复位移问题：固定模式下挂载到 parentActor，跟随模式挂载到 _clock
                let targetParent = fixedMode ? this._customTextParent : this._clock;
                
                if (targetParent && this._customTextLabel.get_parent() !== targetParent) {
                    if (this._customTextLabel.get_parent())
                        this._customTextLabel.get_parent().remove_child(this._customTextLabel);
                    targetParent.add_child(this._customTextLabel);
                }

                this._customTextLabel.set_text(text);
                let style = `font-size: ${size}px; color: ${color};`;
                if (shadow) style += ` text-shadow: 2px 2px 4px ${shadowColor};`;
                this._customTextLabel.set_style(style);
                this._customTextLabel.set_translation(posX, posY, 0);
            };

            this._updateCustomText();

            // 监听设置变化
            const signalIds = [
                ext._settings.connect('changed', () => this._updateCustomText())
            ];

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

            this.connect('destroy', () => {
                signalIds.forEach(id => ext._settings.disconnect(id));
                if (this._customTextLabel) {
                    this._customTextLabel.destroy();
                    this._customTextLabel = null;
                }
            });
        };
    }

    disable() {
        if (this._originalInit) {
            UnlockDialog.UnlockDialog.prototype._init = this._originalInit;
            this._originalInit = null;
        }
        this._settings = null;
    }
}