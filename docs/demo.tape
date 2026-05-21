# Demo recording for the README hero GIF.
# Generate with: vhs docs/demo.tape   →   writes docs/demo.gif
# vhs: https://github.com/charmbracelet/vhs   (brew install vhs)
# Requires: `unison` on PATH and UNISON_TOKEN set (or `unison auth login` first).

Output docs/demo.gif

Set FontSize 18
Set Width 1100
Set Height 640
Set Padding 24
Set Theme "Dracula"

Type "unison search 'why did we pick device-flow auth'"
Sleep 600ms
Enter
Sleep 3s

Type "unison get /wiki/decisions/auth.md"
Sleep 600ms
Enter
Sleep 3s

Type "unison entity resolve 'Daniel'"
Sleep 600ms
Enter
Sleep 3s
