(() => {
  // Grid dimensions must match the constructor's saved project format.
  const ROWS = 12; // Number of crossword rows.
  const COLS = 14; // Number of crossword columns.

  // Small helpers used throughout the player.
  const $ = (id) => document.getElementById(id); // Find an element by its ID.
  const key = (row, column) => `${row},${column}`; // Convert a grid coordinate into a clue-data key.

  // Movement offsets for horizontal and vertical answers.
  const dirs = { H: [0, 1], V: [1, 0] }; // Row/column movement for each answer direction.
  const dirName = { H: "Across", V: "Down" }; // Human-readable direction labels.

  // Current puzzle state. These values are replaced when a project is loaded.
  let puzzle = null; // Full project data loaded from the .spfun file.
  let placements = []; // Word positions and directions from the constructor.
  let clueData = {}; // Clue text and arrow metadata, indexed by clue coordinate.
  let letters = []; // Correct answer letters at each grid coordinate; null for unused cells.
  let cellOwners = []; // Word indexes that cross each grid coordinate.
  let entries = []; // Solver entries, including the user's current letters.
  let activeWord = -1; // Index of the currently selected answer; -1 means none selected.
  let activeOffset = 0; // Character position selected within the active answer.
  let finished = false; // Whether the entire crossword has been solved correctly.
  let hasChecked = false; // Whether the user has clicked CHECK since their last edit.

  // Unicode arrow glyphs used by the constructor. Kept for compatibility with saved data.
  const arrowChars = { r: "⭢", l: "⭠", u: "⭡", d: "⭣", rd: "⮧", ld: "⮦", dr: "⮡", ru: "⮣" };

  // PROJECT LOADING AND VALIDATION
  // Check that a selected file uses the format and grid size this player supports.
  function valid(data){
    if(!data||data.format!=="sunday-press-fun"||data.version!==1)return "This is not a compatible Sunday Press Fun project file.";
    if(!data.grid||data.grid.rows!==ROWS||data.grid.cols!==COLS)return "This puzzle uses a different grid size.";
    if(!data.state||!Array.isArray(data.state.placements))return "The project file is missing crossword data.";
    return null;
  }
  // Apply the saved theme, falling back to Sage for unknown values.
  function setTheme(theme){document.body.dataset.theme=["sage","blue","terracotta"].includes(theme)?theme:"sage"}
  // Convert saved project data into the in-memory state used by the player.
  function build(data){
    const error=valid(data);if(error){alert(error);return false}
    puzzle=data;setTheme(data.theme);placements=data.state.placements.map(p=>({...p}));
    clueData={};for(const [k,v] of Object.entries(data.state.clueData||{}))clueData[k]={text:typeof v.text==="string"?v.text:"",arrows:Array.isArray(v.arrows)?v.arrows:[]};
    letters=Array.from({length:ROWS},()=>Array(COLS).fill(null));cellOwners=Array.from({length:ROWS},()=>Array.from({length:COLS},()=>[]));entries=[];
    placements.forEach((p,i)=>{const [dr,dc]=dirs[p.dir]||dirs.H;for(let n=0;n<p.word.length;n++){const r=p.r+dr*n,c=p.c+dc*n;if(r>=0&&r<ROWS&&c>=0&&c<COLS){letters[r][c]=p.word[n];cellOwners[r][c].push(i)}}entries.push({placement:p,index:i,clue:key(p.clueR,p.clueC),answer:Array(p.word.length).fill("")})});
    $("empty").classList.add("hidden");$("game").classList.remove("hidden");finished=false;hasChecked=false;$("done").classList.remove("show");renderClues();render();selectWord(0,0);return true;
  }
  // GRID COORDINATE HELPERS
  // Return a letter offset for a coordinate within a placed word.
  function offsetForCell(i,r,c){const p=placements[i];return p?(p.dir==="H"?c-p.c:r-p.r):-1}
  function cellRC(i,off){const p=placements[i];return [p.r+(p.dir==="V"?off:0),p.c+(p.dir==="H"?off:0)]}
  function getValue(r,c){const owners=cellOwners[r]?.[c]||[];if(!owners.length)return "";const i=owners[0],off=offsetForCell(i,r,c);return entries[i].answer[off]||""}
  function isCorrectCell(r,c){const owners=cellOwners[r]?.[c]||[];return owners.length>0&&owners.every(i=>{const off=offsetForCell(i,r,c);return entries[i].answer[off]===placements[i].word[off]})&&owners.some(i=>entries[i].answer[offsetForCell(i,r,c)])}
  // DRAW THE BOARD AND CLUE LISTS
  // Rebuild the visible crossword using the current answers and selection.
  function render(){
    const board=$("board");board.innerHTML="";
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const cell=document.createElement("div");cell.className="cell";const owners=cellOwners[r][c];
      if(!owners.length){cell.classList.add("blocked");board.appendChild(cell);continue}
      const active=owners.includes(activeWord);if(active)cell.classList.add("active-word");
      const off=active?offsetForCell(activeWord,r,c):-1;if(active&&off===activeOffset)cell.classList.add("active");
      const val=getValue(r,c);if(val)cell.classList.add("filled");
      if(hasChecked&&val&&!isCorrectCell(r,c))cell.classList.add("wrong");
      else if(hasChecked&&val&&isCorrectCell(r,c))cell.classList.add("correct");
      const span=document.createElement("span");span.className="letter";span.textContent=val;cell.appendChild(span);
      cell.addEventListener("click",()=>{let i=activeWord;if(!owners.includes(i))i=owners[0];selectWord(i,Math.max(0,offsetForCell(i,r,c)))});
      board.appendChild(cell);
    }
    updateProgress();renderKeyboard();
  }
  // Create the Across and Down clue buttons from the loaded entries.
  function renderClues(){
    const across=$("across"),down=$("down");across.innerHTML="";down.innerHTML="";
    const sorted=[...entries].sort((a,b)=>a.index-b.index);
    for(const e of sorted){
      const p=e.placement,cd=clueData[e.clue]||{},btn=document.createElement("button");btn.className="clue-item";btn.dataset.index=e.index;
      btn.innerHTML=`<span class="clue-num">${String(e.index+1).padStart(2,"0")}</span><span class="clue-text"></span><span class="clue-len">${p.word.length}</span>`;btn.querySelector(".clue-text").textContent=cd.text||"—";btn.addEventListener("click",()=>selectWord(e.index,0));
      (p.dir==="H"?across:down).appendChild(btn);
    }
    $("acrossCount").textContent=entries.filter(e=>e.placement.dir==="H").length+" clues";
    $("downCount").textContent=entries.filter(e=>e.placement.dir==="V").length+" clues";
  }
  // Keep the selected clue card and the large current-clue display in sync.
  function updateClue(){
    const e=entries[activeWord];if(!e)return;const p=e.placement,cd=clueData[e.clue]||{};
    $("currentDir").textContent=dirName[p.dir];$("currentLen").textContent=p.word.length+" letters";$("currentClue").textContent=cd.text||"—";
    document.querySelectorAll(".clue-item").forEach(x=>x.classList.toggle("active",Number(x.dataset.index)===activeWord));
    if(finished){$("currentClue").textContent="Puzzle complete. Nice work.";$("done").classList.add("show")}
  }
  function selectWord(i,off=0){if(i<0||!entries[i])return;activeWord=i;activeOffset=Math.max(0,Math.min(off,placements[i].word.length-1));updateClue();render()}
  // SOLVER INPUT
  // Enter a letter into the selected square, including any crossing answer.
  function put(ch){if(activeWord<0||finished)return;const p=placements[activeWord];let r,c;[r,c]=cellRC(activeWord,activeOffset);const value=ch.toUpperCase();for(const i of cellOwners[r][c]){const off=offsetForCell(i,r,c);entries[i].answer[off]=value}if(activeOffset<p.word.length-1)activeOffset++;else moveWord(1);hasChecked=false;$("done").classList.remove("show");finished=false;updateClue();render()}
  function back(){if(activeWord<0||finished)return;hasChecked=false;$("done").classList.remove("show");let off=activeOffset;if(entries[activeWord].answer[off]&&off===activeOffset){const [r,c]=cellRC(activeWord,off);for(const i of cellOwners[r][c])entries[i].answer[offsetForCell(i,r,c)]="";return render()}if(off>0)off--;const [r,c]=cellRC(activeWord,off);for(const i of cellOwners[r][c])entries[i].answer[offsetForCell(i,r,c)]="";activeOffset=off;render()}
  function moveWord(delta){if(!entries.length)return;let i=activeWord;for(let n=0;n<entries.length;n++){i=(i+delta+entries.length)%entries.length;if(i!==activeWord){activeWord=i;activeOffset=0;updateClue();render();return}}}
  // CHECK BUTTON
  // Validate all entered letters only when the user explicitly clicks CHECK.
  function checkFinished(){
    hasChecked=true;
    const allFilled=entries.every(e=>e.answer.every(Boolean));
    finished=allFilled&&entries.every((e,i)=>e.answer.join("")===placements[i].word);
    render();
    if(finished){updateClue();$("done").textContent="Puzzle complete. Nice work.";$("done").classList.add("show");}
    else {
      const hasErrors=entries.some((e,i)=>e.answer.some((ch,off)=>ch&&ch!==placements[i].word[off]));
      $("done").textContent=hasErrors?"Some letters are incorrect. Keep trying!":"Keep filling in the crossword, then check again.";
      $("done").classList.add("show");
    }
  }
  // Update the entered-letter counter shown above the crossword.
  function updateProgress(){let total=0,filled=0;entries.forEach((e,i)=>{total+=placements[i].word.length;filled+=e.answer.filter(Boolean).length});$("progress").textContent=`${filled} / ${total}`}
  // Build the on-screen keyboard once; its buttons call the same input functions.
  function renderKeyboard(){const kb=$("keyboard");if(!kb.children.length){const keys="QWERTYUIOPASDFGHJKLZXCVBNM".split("");keys.forEach(k=>{const b=document.createElement("button");b.className="key";b.textContent=k;b.addEventListener("click",()=>put(k));kb.appendChild(b)});const del=document.createElement("button");del.className="key wide";del.textContent="⌫";del.addEventListener("click",back);kb.appendChild(del);const next=document.createElement("button");next.className="key wide accent";next.textContent="NEXT";next.addEventListener("click",()=>moveWord(1));kb.appendChild(next)}}
  // KEYBOARD EVENTS
  // Support typing, erasing, switching clues, and moving between letters.
  document.addEventListener("keydown",e=>{
    if($("game").classList.contains("hidden")||finished)return;
    if(/^[a-zA-Z]$/.test(e.key)){e.preventDefault();put(e.key);return}
    if(e.key==="Backspace"){e.preventDefault();back();return}
    if(e.key==="Tab"){e.preventDefault();moveWord(e.shiftKey?-1:1);return}
    if(["ArrowRight","ArrowDown"].includes(e.key)){e.preventDefault();if(activeOffset<placements[activeWord].word.length-1){activeOffset++;render()}else moveWord(1);return}
    if(["ArrowLeft","ArrowUp"].includes(e.key)){e.preventDefault();if(activeOffset>0){activeOffset--;render()}else moveWord(-1)}
  });
  $("checkButton").addEventListener("click",checkFinished);
  $("loadBtn").addEventListener("click",()=>$("file").click());$("emptyOpen").addEventListener("click",()=>$("file").click());
  $("file").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{build(JSON.parse(await f.text()))}catch(err){alert("Could not read that project file.")}e.target.value=""});
})();
