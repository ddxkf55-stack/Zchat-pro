import Icon from './Icon.jsx';

const STICKERS = ['thumbs_up', 'heart', 'fire', 'laugh', 'sad', 'wave', 'clap', 'rocket'];

export default function StickerPicker({ onSelect }) {
  return (
    <div className="sticker-picker">
      <div className="sticker-picker-header">
        <Icon name="Image" size={16} />
        <span>ستيكرز</span>
      </div>
      <div className="stickers-grid">
        {STICKERS.map((s) => (
          <div key={s} className="sticker-item" onClick={() => onSelect(s)}>
            <img src={`/stickers/${s}.svg`} alt={s} />
          </div>
        ))}
      </div>
    </div>
  );
}