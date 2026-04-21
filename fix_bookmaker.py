import re
import os

file_path = 'src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacement for the button block
new_jsx = """{isManualBookmaker ? (
                                     <div className="relative col-span-2">
                                       <input
                                         type="text"
                                         autoFocus
                                         value={betForm.bookmaker}
                                         onChange={(e) => setBetForm({...betForm, bookmaker: e.target.value})}
                                         onBlur={() => {
                                            if (!betForm.bookmaker || betForm.bookmaker.trim() === '') setIsManualBookmaker(false);
                                         }}
                                         placeholder="Digite a casa..."
                                         className="w-full px-4 py-3 bg-surface border border-accent text-[10px] font-black uppercase tracking-tight rounded-lg focus:outline-none"
                                       />
                                       <button 
                                         type="button"
                                         onClick={() => {
                                           setBetForm({...betForm, bookmaker: ''});
                                           setIsManualBookmaker(false);
                                         }}
                                         className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-loss transition-colors"
                                       >
                                         <X className="w-4 h-4" />
                                       </button>
                                     </div>
                                   ) : (
                                     <button
                                        type="button"
                                        onClick={() => {
                                          const isCustom = betForm.bookmaker !== '' && !BOOKMAKERS.includes(betForm.bookmaker);
                                          if (isCustom) {
                                            setBetForm({...betForm, bookmaker: ''});
                                          } else {
                                            setIsManualBookmaker(true);
                                            setBetForm({...betForm, bookmaker: ''});
                                          }
                                        }}
                                        className={cn(
                                           "px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all duration-300",
                                           (betForm.bookmaker !== '' && !BOOKMAKERS.includes(betForm.bookmaker))
                                              ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_-8px_rgba(34,197,94,0.5)]" 
                                              : "bg-surface border-border text-text-dim hover:border-border-hover"
                                        )}
                                     >
                                        {(betForm.bookmaker !== '' && !BOOKMAKERS.includes(betForm.bookmaker)) ? betForm.bookmaker : "Outra"}
                                     </button>
                                   )}"""

# regex to find the button that contains Outra_MARKER
# It starts with <button and ends with </button> and contains Outra_MARKER inside
pattern = r'<button[^>]* type="button"[^>]*onClick=\{[^}]*\}\s+className=\{cn\([^)]+\)\}\s*>\s*\{\(betForm\.bookmaker !== \'\' && !BOOKMAKERS\.includes\(betForm\.bookmaker\)\) \? betForm\.bookmaker : "Outra_MARKER"\}\s*</button>'

# Let's try a simpler one first: just replace the line with the marker and some context
content = content.replace('{(betForm.bookmaker !== \'\' && !BOOKMAKERS.includes(betForm.bookmaker)) ? betForm.bookmaker : "Outra_MARKER"}', '{(betForm.bookmaker !== \'\' && !BOOKMAKERS.includes(betForm.bookmaker)) ? betForm.bookmaker : "Outra"}')

# Actually, I want to wrap the whole button. 
# I'll use a more surgical approach by searching for the exact lines I saw in view_file.

# Registration form block (lines 1594-1613 approx)
# Edit modal block (lines 3234-3253 approx)

# Since the content might vary slightly in indentation, let's use markers.
# I'll just find the button that has the specific onClick with setIsManualBookmaker(true)

# Let's do it per line for safety.
lines = content.split('\\n')
new_lines = []
skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue
    
    if 'setIsManualBookmaker(true);' in line and i < len(lines) - 10:
        # Check if we are inside a button block
        # Look backwards for <button
        start = i
        while start > 0 and '<button' not in lines[start]:
            start -= 1
            
        # Look forward for </button>
        end = i
        while end < len(lines) - 1 and '</button>' not in lines[end]:
            end += 1
            
        if '<button' in lines[start] and '</button>' in lines[end]:
            # Found a bookmaker "Outra" button block
            # Determine indentation from start line
            indent = lines[start][:lines[start].find('<button')]
            
            # Construct replacement
            replacement = [
                f"{indent}{{isManualBookmaker ? (",
                f"{indent}  <div className=\\"relative col-span-2\\">",
                f"{indent}    <input",
                f"{indent}      type=\\"text\\"",
                f"{indent}      autoFocus",
                f"{indent}      value={{betForm.bookmaker}}",
                f"{indent}      onChange={{(e) => setBetForm({{...betForm, bookmaker: e.target.value}})}}",
                f"{indent}      onBlur={{() => {{",
                f"{indent}         if (!betForm.bookmaker || betForm.bookmaker.trim() === '') setIsManualBookmaker(false);",
                f"{indent}      }}}}",
                f"{indent}      placeholder=\\"Digite a casa...\\"",
                f"{indent}      className=\\"w-full px-4 py-3 bg-surface border border-accent text-[10px] font-black uppercase tracking-tight rounded-lg focus:outline-none\\"",
                f"{indent}    />",
                f"{indent}    <button ",
                f"{indent}      type=\\"button\\"",
                f"{indent}      onClick={{() => {{",
                f"{indent}        setBetForm({{...betForm, bookmaker: ''}});",
                f"{indent}        setIsManualBookmaker(false);",
                f"{indent}      }}}}",
                f"{indent}      className=\\"absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-loss transition-colors\\"",
                f"{indent}    >",
                f"{indent}      <X className=\\"w-4 h-4\\" />",
                f"{indent}    </button>",
                f"{indent}  </div>",
                f"{indent}) : (",
            ]
            # Copy original button lines
            for j in range(start, end + 1):
                replacement.append(lines[j])
            
            replacement.append(f"{indent})}}")
            
            new_lines.extend(replacement)
            skip = end - i
            # Also adjust the index we started at
            # We already added lines up to end, so we effectively replaced start...end
            # Our current loop index is i. We need to skip until end.
            # But we added lines start...i-1 before this. Wait.
            
            # Let's restart the logic.
            pass

# That was too complex. Let's just use markers and string replace.
content = content.replace('"Outra_MARKER"', '"Outra"')
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
