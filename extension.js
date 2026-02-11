import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as UnlockDialogModule from 'resource:///org/gnome/shell/ui/unlockDialog.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';

// 从 unlockDialog.js 复制的动画常量，确保同步
const FADE_OUT_TRANSLATION = 200;
const FADE_OUT_SCALE = 0.3;

const UnlockDialog = UnlockDialogModule.UnlockDialog;

// 自定义标签类，封装样式和更新逻辑
const CustomLockLabel = GObject.registerClass(
class CustomLockLabel extends St.Label {
    _init(settings) {
        super._init({
            style_class: 'custom-lock-label',
            text: '',
            x_expand: true, // 确保能够占满约束区域以实现对齐
            y_expand: true,
        });
        
        this._settings = settings;
        // 添加 MonitorConstraint 确保它覆盖主屏幕区域
        this.add_constraint(new Layout.MonitorConstraint({ primary: true }));

        this._settingsChangedId = this._settings.connect('changed', this._updateStyleAndPos.bind(this));
        
        this._updateStyleAndPos();
    }

    _updateStyleAndPos() {
        // 1. 更新文本
        this.text = this._settings.get_string('custom-text');

        // 2. 更新样式
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

        // 3. 更新对齐方式 (预设位置)
        const preset = this._settings.get_string('position-preset');
        
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
            case 'center':
                this.x_align = Clutter.ActorAlign.CENTER;
                this.y_align = Clutter.ActorAlign.CENTER;
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
            default: // 默认 top-center
                this.x_align = Clutter.ActorAlign.CENTER;
                this.y_align = Clutter.ActorAlign.START;
        }

        // 4. 存储基础偏移量 (Manual Offsets)
        // 实际的 translation_x/y 会在动画循环中结合这个值和动画值计算
        this._baseOffsetX = this._settings.get_int('pos-x');
        this._baseOffsetY = this._settings.get_int('pos-y');
        
        // 立即应用一次基础位置（假设当前没有动画）
        this.translation_x = this._baseOffsetX;
        
        // 检查当前是否应该处于固定模式，如果不处于动画中，立即更新 Y
        const fixedMode = this._settings.get_boolean('fixed-mode');
        if (fixedMode) {
            this.translation_y = this._baseOffsetY;
            this.opacity = 255;
            this.scale_x = 1;
            this.scale_y = 1;
        }
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
        
        // 保存原始方法以便后续恢复
        this._origInit = UnlockDialog.prototype._init;
        this._origSetTransitionProgress = UnlockDialog.prototype._setTransitionProgress;

        const extSelf = this;

        // Monkey-patch _init 方法：注入我们的 Label
        UnlockDialog.prototype._init = function(parentActor) {
            // 调用原始构造
            extSelf._origInit.call(this, parentActor);

            // 创建并添加 Label
            this._customTextLabel = new CustomLockLabel(extSelf._settings);
            
            // 将 Label 添加到 UnlockDialog (St.Widget) 自身
            // 注意：我们使用 MonitorConstraint 在 Label 内部进行定位，所以直接添加即可
            this.add_child(this._customTextLabel);
            
            // 调整层级：确保它显示在 _stack (包含时钟和密码框) 的下方或上方？
            // 通常时钟在最上层，背景在最下层。我们将文本放在 _stack 后面，或者作为兄弟元素。
            // 为了不遮挡输入框，建议放在 stack 下面，但由于我们支持自定义位置，
            // 如果用户放在中间可能会遮挡。
            // 这里我们不做特殊层级调整，它是后添加的，会覆盖在背景上。
            // 只要不遮挡 AuthPrompt 即可。AuthPrompt 在 _stack 中。
            // 让它在 _stack 之下（视觉上位于时钟/输入框的下层，但在背景之上）
            this.set_child_below_sibling(this._customTextLabel, this._stack);
        };

        // Monkey-patch _setTransitionProgress 方法：处理动画
        UnlockDialog.prototype._setTransitionProgress = function(progress) {
            // 调用原始动画逻辑（处理时钟和密码框）
            extSelf._origSetTransitionProgress.call(this, progress);

            if (!this._customTextLabel) return;

            const fixedMode = extSelf._settings.get_boolean('fixed-mode');

            if (!fixedMode) {
                // 动画模式：跟随时钟移动和消失
                // 逻辑源自 unlockDialog.js
                
                const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                
                // 1. 透明度：从 255 变到 0
                this._customTextLabel.opacity = 255 * (1 - progress);
                
                // 2. 缩放：变小
                const scale = FADE_OUT_SCALE + (1 - FADE_OUT_SCALE) * (1 - progress);
                this._customTextLabel.scale_x = scale;
                this._customTextLabel.scale_y = scale;
                
                // 3. Y轴位移：基础偏移 + 动画偏移
                // progress 0 -> 1 (时钟消失)
                const animTransY = -FADE_OUT_TRANSLATION * progress * scaleFactor;
                
                this._customTextLabel.translation_y = this._customTextLabel._baseOffsetY + animTransY;

            } else {
                // 固定模式：重置所有动画属性
                this._customTextLabel.opacity = 255; 
                this._customTextLabel.scale_x = 1;
                this._customTextLabel.scale_y = 1;
                this._customTextLabel.translation_y = this._customTextLabel._baseOffsetY;
            }
        };

        // 如果启用扩展时屏幕已经被锁定（开发调试情况），手动注入
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
        // 恢复原始方法
        if (this._origInit) {
            UnlockDialog.prototype._init = this._origInit;
            this._origInit = null;
        }

        if (this._origSetTransitionProgress) {
            UnlockDialog.prototype._setTransitionProgress = this._origSetTransitionProgress;
            this._origSetTransitionProgress = null;
        }

        // 清理已存在的 Label
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