const createHighlightStyle = (start, end, text, shadow, border, borderWidth = 2) => ({
background: `linear-gradient(135deg, ${start}, ${end})`,
text,
shadow: `0 0 8px ${shadow}`,
border: `${borderWidth}px solid ${border}`
});

const HIGHLIGHT_THEMES = {
default: createHighlightStyle('rgba(0, 191, 255, 0.7)', 'rgba(30, 144, 255, 0.7)', '#ffffff', 'rgba(0, 191, 255, 0.8)', '#00bfff'),
selected: {
    background: 'linear-gradient(135deg, rgba(0, 255, 127, 0.8), rgba(0, 250, 154, 0.8))',
    text: '#000000',
    shadow: '0 0 12px rgba(0, 255, 127, 1.0)',
    border: '3px solid #00ff7f'
}
};

const HIGHLIGHT_COLOR_PRESETS = {
default: HIGHLIGHT_THEMES.default,
red: createHighlightStyle('rgba(255, 0, 0, 0.7)', 'rgba(220, 20, 60, 0.7)', '#ffffff', 'rgba(255, 0, 0, 0.8)', '#ff0000'),
green: createHighlightStyle('rgba(0, 255, 0, 0.7)', 'rgba(34, 139, 34, 0.7)', '#000000', 'rgba(0, 255, 0, 0.8)', '#00ff00'),
purple: createHighlightStyle('rgba(128, 0, 128, 0.7)', 'rgba(75, 0, 130, 0.7)', '#ffffff', 'rgba(128, 0, 128, 0.8)', '#800080'),
orange: createHighlightStyle('rgba(255, 165, 0, 0.7)', 'rgba(255, 69, 0, 0.7)', '#000000', 'rgba(255, 165, 0, 0.8)', '#ffa500'),
pink: createHighlightStyle('rgba(255, 192, 203, 0.7)', 'rgba(255, 20, 147, 0.7)', '#000000', 'rgba(255, 192, 203, 0.8)', '#ffc0cb')
};
