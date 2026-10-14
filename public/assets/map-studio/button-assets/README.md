# Map Studio Button Assets

Style: vintage nautical map + old metal nameplate.

Use:
- buttons/text-button-*.svg: top primary tool buttons with Chinese labels rendered by code.
- buttons/icon-button-*.svg: right toolbar square buttons.
- icons/core/*.svg: Map Studio core tools.
- icons/toolbar/*.svg: right toolbar tools.

Recommended implementation:
- Keep button text in code, not baked into images.
- Use SVGs as CSS backgrounds or inline components.
- Use text-button skins for top tools and icon-button skins for the right toolbar.
- Remove shortcut key boxes if following this asset direction.

Color tokens:
- text/icon: #EBD5A0
- metal stroke: #C69B50 / #85602D
- dark paper: #181816
- accent copper: #B9863D
