/* ═══════════ STATE ═══════════ */
let state = {
  employees:[],attendance:[],payrolls:[],deductions:[],
  biometrics:[],bioLogs:[],
  branches:[],
  settings:{
    company:'Don Macchiatos',address:'123 Business Ave, Manila',
    tagline:'MASARAP PERO HINDI MAHAL',
    contact:'+63 2 1234 5678',
    workStart:'08:00',workEnd:'17:00',grace:15,
    tax:5,ot:1.25,nd:1.10,hol:2.0,deMin:2000,thirteenth:'basic',
    hrName:'Administrator',hrRole:'HR Manager'
  }
};

let currentBranch = null;
let currentAttTab = 'today';
let currentReportTab = 'attendance';
let editEmpId = null;
let editDedId = null;
let editBranchId = null;
let changePwBranchId = null;
let enrollTimer = null;
let payrollRows = [];

/* ═══════════ INIT ═══════════ */
function init() {
  const saved = localStorage.getItem('biopay_state');
  if (saved) { try { state = {...state,...JSON.parse(saved)}; } catch(e){} }
  if (!state.branches) state.branches = [];
  // ensure tagline persists in existing saved state
  if (!state.settings.tagline) state.settings.tagline = 'MASARAP PERO HINDI MAHAL';
  if (!state.employees.length) seedData();
  if (!state.branches.length) seedBranches();
  populateLoginBranches();
  document.getElementById('loginCompanyName').textContent = state.settings.company || 'BioPay System';
  startLiveClock();
}

function seedBranches() {
  state.branches = [
    {id:'BR-001',name:'Main Branch',code:'BR-001',location:'Manila, Metro Manila',manager:'Maria Santos',contact:'+63 2 8123 4567',password:'main123',status:'active',notes:'Head office'},
    {id:'BR-002',name:'Quezon City Branch',code:'BR-002',location:'Quezon City, Metro Manila',manager:'Juan dela Cruz',contact:'+63 2 8234 5678',password:'qc123',status:'active',notes:''},
    {id:'BR-003',name:'Cebu Branch',code:'BR-003',location:'Cebu City, Cebu',manager:'Ana Reyes',contact:'+63 32 234 5678',password:'cebu123',status:'active',notes:'Visayas operations'},
  ];
  state.employees.forEach((emp,i) => {
    emp.branchId = state.branches[i % state.branches.length].id;
  });
  save();
}

function seedData() {
  state.employees = [
    {id:'EMP-001',fname:'Maria',lname:'Santos',pos:'Software Engineer',dept:'Engineering',type:'regular',dayRate:1200,pin:'1234',hired:'2022-01-15',status:'active',sss:'01-2345678-9',ph:'1234-5678-9012',pi:'1234-5678-9012',tin:'123-456-789',branchId:'BR-001'},
    {id:'EMP-002',fname:'Juan',lname:'dela Cruz',pos:'Operations Manager',dept:'Operations',type:'regular',dayRate:1500,pin:'2345',hired:'2021-06-01',status:'active',sss:'02-3456789-0',ph:'2345-6789-0123',pi:'2345-6789-0123',tin:'234-567-890',branchId:'BR-001'},
    {id:'EMP-003',fname:'Ana',lname:'Reyes',pos:'Finance Analyst',dept:'Finance',type:'probationary',dayRate:950,pin:'3456',hired:'2023-03-10',status:'active',sss:'03-4567890-1',ph:'3456-7890-1234',pi:'3456-7890-1234',tin:'345-678-901',branchId:'BR-002'},
    {id:'EMP-004',fname:'Pedro',lname:'Garcia',pos:'Sales Representative',dept:'Sales',type:'regular',dayRate:800,pin:'4567',hired:'2022-08-20',status:'active',sss:'04-5678901-2',ph:'4567-8901-2345',pi:'4567-8901-2345',tin:'456-789-012',branchId:'BR-002'},
    {id:'EMP-005',fname:'Linda',lname:'Flores',pos:'HR Specialist',dept:'Human Resources',type:'regular',dayRate:1000,pin:'5678',hired:'2020-11-05',status:'active',sss:'05-6789012-3',ph:'5678-9012-3456',pi:'5678-9012-3456',tin:'567-890-123',branchId:'BR-003'},
  ];
  const today = new Date();
  for (let d = 9; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate()-d);
    const ds = dt.toISOString().split('T')[0];
    state.employees.forEach(emp => {
      if (Math.random() > 0.12) {
        const inMin = 480 + Math.floor(Math.random()*40);
        const outMin = 1020 + Math.floor(Math.random()*60);
        const ot = outMin > 1080 ? ((outMin-1080)/60).toFixed(1)*1 : 0;
        state.attendance.push({
          id:Date.now()+Math.random(),empId:emp.id,date:ds,
          timeIn:minToTime(inMin),timeOut:minToTime(outMin),
          status:inMin>(480+15)?'late':'present',otHours:ot,method:'biometric',remark:''
        });
      }
    });
  }
  state.employees.slice(0,3).forEach(emp => {
    state.biometrics.push({empId:emp.id,fingers:['right_thumb','right_index'],enrolledAt:new Date().toISOString()});
  });
  save();
}

function save() { localStorage.setItem('biopay_state', JSON.stringify(state)); }

function refreshAll() {
  renderEmployees(); renderAttendance(); renderEnrolled();
  renderDeductions(); renderPayslips(); renderDashboard();
  renderBranches(); populateSelects(); updateBadge();
}

/* ═══════════ LOGIN / BRANCH ═══════════ */
function populateLoginBranches() {
  const sel = document.getElementById('loginBranchSelect');
  const activeBranches = (state.branches||[]).filter(b=>b.status==='active');
  sel.innerHTML = '<option value="">-- Select Branch --</option>' +
    activeBranches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  document.getElementById('loginCompanyName').textContent = state.settings.company || 'BioPay System';
}

function onBranchSelect() {
  const id = document.getElementById('loginBranchSelect').value;
  const pwField = document.getElementById('loginPasswordField');
  const lbl = document.getElementById('loginBranchLabel');
  if (id) {
    const b = state.branches.find(x=>x.id===id);
    pwField.style.display = '';
    lbl.style.display = '';
    lbl.textContent = b ? b.name : '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.remove('show');
  } else {
    pwField.style.display = 'none';
    lbl.style.display = 'none';
  }
}

function doLogin() {
  const id = document.getElementById('loginBranchSelect').value;
  const pw = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  if (!id) { errEl.textContent='Please select a branch.'; errEl.classList.add('show'); return; }
  if (!pw) { errEl.textContent='Please enter the branch password.'; errEl.classList.add('show'); return; }
  const branch = state.branches.find(b=>b.id===id);
  if (!branch) { errEl.textContent='Branch not found.'; errEl.classList.add('show'); return; }
  if (branch.password !== pw) {
    errEl.textContent='Incorrect password. Please try again.';
    errEl.classList.add('show');
    document.getElementById('loginPassword').value='';
    document.getElementById('loginPassword').focus();
    return;
  }
  // success
  currentBranch = branch;
  errEl.classList.remove('show');
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').style.display = 'flex';
  document.getElementById('topbarBranchName').textContent = branch.name;
  document.getElementById('pageDate').textContent = new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('sideUser').textContent = state.settings.hrName || 'Administrator';
  document.getElementById('sideRole').textContent = state.settings.hrRole || 'HR Manager';
  document.getElementById('sideAvatar').textContent = (state.settings.hrName||'A')[0].toUpperCase();
  // sync settings UI
  const cfgTagline = document.getElementById('cfgTagline');
  if (cfgTagline) cfgTagline.value = state.settings.tagline || 'MASARAP PERO HINDI MAHAL';
  refreshAll();
  toast('Welcome to '+branch.name,'success');
}

function doLogout() {
  currentBranch = null;
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginBranchSelect').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginPasswordField').style.display = 'none';
  document.getElementById('loginBranchLabel').style.display = 'none';
  document.getElementById('loginError').classList.remove('show');
  populateLoginBranches();
}

/* ═══════════ NAV ═══════════ */
const pageTitles = {
  dashboard:'Dashboard',biometric:'Biometric Enrollment',attendance:'Attendance Monitoring',
  employees:'Employee Management',payroll:'Process Payroll',payslips:'Payslip Records',
  deductions:'Deductions & Contributions',reports:'Reports',branches:'Branch Management',settings:'Settings'
};

function showPage(p) {
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById('pg-'+p)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(ni=>ni.classList.remove('active'));
  const map={dashboard:'Dashboard',biometric:'Biometric',attendance:'Attendance',employees:'Employees',
    payroll:'Process',payslips:'Payslips',deductions:'Deductions',reports:'Reports',
    branches:'Branches',settings:'Configuration'};
  document.querySelectorAll('.nav-item').forEach(ni=>{
    if(ni.textContent.trim().includes(map[p]||'~~~')) ni.classList.add('active');
  });
  document.getElementById('pageTitle').textContent = pageTitles[p]||p;
  if(p==='branches') renderBranches();
}

/* ═══════════ CLOCK ═══════════ */
function startLiveClock() {
  function tick() {
    const n=new Date(),t=n.toLocaleTimeString('en-PH');
    const mc=document.getElementById('modalClock'); if(mc)mc.textContent=t;
    const md=document.getElementById('modalDate'); if(md)md.textContent=n.toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  }
  tick(); setInterval(tick,1000);
}

/* ═══════════ MODALS ═══════════ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if(id==='clockModal') populateClockSelect();
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ═══════════ TOAST ═══════════ */
let toastTimer;
function toast(msg,type='info') {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='show '+type;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.className='',3000);
}

/* ═══════════ SELECTS ═══════════ */
function populateSelects() {
  const branchEmps = currentBranch
    ? state.employees.filter(e=>e.branchId===currentBranch.id)
    : state.employees;

  const opts = branchEmps.map(e=>`<option value="${e.id}">${e.fname} ${e.lname} (${e.id})</option>`).join('');
  ['bioEmpSelect','mAttEmp','dedEmp'].forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML='<option value="">— Select employee —</option>'+opts;
  });

  const bOpts = state.branches.map(b=>`<option value="${b.id}">${b.name} (${b.code})</option>`).join('');
  const empBranch=document.getElementById('empBranch');
  if(empBranch) empBranch.innerHTML='<option value="">— Assign Branch —</option>'+bOpts;

  const slipPF=document.getElementById('slipPeriodFilter');
  const periods=[...new Set(state.payrolls.map(p=>p.period))];
  slipPF.innerHTML='<option value="all">All Periods</option>'+periods.map(p=>`<option>${p}</option>`).join('');
  const rPP=document.getElementById('rPayPeriod');
  if(rPP) rPP.innerHTML='<option value="all">All Periods</option>'+periods.map(p=>`<option>${p}</option>`).join('');
}

function populateClockSelect() {
  const branchEmps = currentBranch
    ? state.employees.filter(e=>e.branchId===currentBranch.id&&e.status==='active')
    : state.employees.filter(e=>e.status==='active');
  document.getElementById('clockEmp').innerHTML='<option value="">— Select employee —</option>'+
    branchEmps.map(e=>`<option value="${e.id}">${e.fname} ${e.lname} (${e.id})</option>`).join('');
}

/* ═══════════ BRANCHES ═══════════ */
function renderBranches() {
  const grid = document.getElementById('branchGrid');
  const empty = document.getElementById('branchEmpty');
  const tbody = document.getElementById('branchTableBody');

  if (!state.branches.length) {
    grid.innerHTML=''; empty.style.display=''; tbody.innerHTML=''; return;
  }
  empty.style.display='none';

  grid.innerHTML = state.branches.map(b=>{
    const empCount = state.employees.filter(e=>e.branchId===b.id&&e.status==='active').length;
    const today = today_str();
    const todayAtts = state.attendance.filter(a=>{
      const emp=state.employees.find(e=>e.id===a.empId);
      return emp&&emp.branchId===b.id&&a.date===today;
    });
    const presentCount = todayAtts.filter(a=>a.status==='present'||a.status==='late').length;
    const lateCount = todayAtts.filter(a=>a.status==='late').length;
    const statBadge = b.status==='active'?'badge-green':'badge-red';
    const isCurrentBranch = currentBranch&&currentBranch.id===b.id;
    return `<div class="branch-card${isCurrentBranch?' current-branch':''}">
      <div class="branch-card-header">
        <div>
          <div class="branch-name-tag">${b.name} ${isCurrentBranch?'<span class="badge badge-green" style="font-size:10px">Current</span>':''}</div>
          <div class="branch-code">📍 ${b.location||'—'} · ${b.code}</div>
        </div>
        <span class="badge ${statBadge}">${b.status}</span>
      </div>
      ${b.manager?`<div class="text-sm mt-4">👤 ${b.manager} ${b.contact?'· '+b.contact:''}</div>`:''}
      <div class="branch-stats-row">
        <div class="branch-stat"><div class="branch-stat-val">${empCount}</div><div class="branch-stat-lbl">Employees</div></div>
        <div class="branch-stat"><div class="branch-stat-val text-green">${presentCount}</div><div class="branch-stat-lbl">Present</div></div>
        <div class="branch-stat"><div class="branch-stat-val" style="color:var(--amber)">${lateCount}</div><div class="branch-stat-lbl">Late</div></div>
      </div>
      <div class="flex gap-8 mt-14">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="editBranch('${b.id}')">✏ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="openChangePw('${b.id}')">🔑 Password</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteBranch('${b.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');

  tbody.innerHTML = state.branches.map(b=>{
    const empCount = state.employees.filter(e=>e.branchId===b.id).length;
    const statBadge = b.status==='active'?'badge-green':'badge-red';
    const maskedPw = '•'.repeat(Math.min(8, b.password?.length||6));
    return `<tr>
      <td><strong>${b.name}</strong></td>
      <td class="mono">${b.code}</td>
      <td>${b.location||'—'}</td>
      <td class="mono">${empCount}</td>
      <td class="mono text-sm" style="letter-spacing:2px">${maskedPw}</td>
      <td><span class="badge ${statBadge}">${b.status}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editBranch('${b.id}')">✏</button>
        <button class="btn btn-blue btn-sm" onclick="openChangePw('${b.id}')">🔑</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteBranch('${b.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

function saveBranch() {
  // Re-enable status before reading its value (it may have been disabled)
  document.getElementById('branchStatus').disabled = false;

  const name = document.getElementById('branchName').value.trim();
  const code = document.getElementById('branchCode').value.trim().toUpperCase();
  const pw = document.getElementById('branchPassword').value;
  const pw2 = document.getElementById('branchPasswordConfirm').value;
  if (!name||!code) { toast('Branch name and code are required','error'); return; }
  if (!editBranchId && !pw) { toast('Password is required','error'); return; }
  if (pw && pw !== pw2) { toast('Passwords do not match','error'); return; }

  // If editing a branch that is NOT the current branch, preserve its existing status
  let newStatus = document.getElementById('branchStatus').value;
  if (editBranchId && currentBranch && currentBranch.id !== editBranchId) {
    // Force-keep the original status — the field was disabled so value may be wrong
    const existing = state.branches.find(b=>b.id===editBranchId);
    if (existing) newStatus = existing.status;
  }

  const branch = {
    id: editBranchId || code,
    name, code,
    location: document.getElementById('branchLocation').value.trim(),
    manager: document.getElementById('branchManager').value.trim(),
    contact: document.getElementById('branchContact').value.trim(),
    password: pw || (editBranchId ? state.branches.find(b=>b.id===editBranchId)?.password : ''),
    status: newStatus,
    notes: document.getElementById('branchNotes').value.trim()
  };

  if (editBranchId) {
    const i = state.branches.findIndex(b=>b.id===editBranchId);
    if (i>=0) state.branches[i] = branch;
    if (currentBranch?.id===editBranchId) {
      currentBranch = branch;
      document.getElementById('topbarBranchName').textContent = branch.name;
    }
  } else {
    if (state.branches.some(b=>b.id===code)) { toast('Branch code already exists','error'); return; }
    state.branches.push(branch);
  }

  save(); renderBranches(); populateSelects(); populateLoginBranches();
  closeModal('branchModal');
  toast(editBranchId?'Branch updated':'Branch added','success');
  editBranchId = null;
}

function editBranch(id) {
  const b = state.branches.find(x=>x.id===id);
  if (!b) return;
  editBranchId = id;
  document.getElementById('branchModalTitle').textContent = 'Edit Branch';
  document.getElementById('branchName').value = b.name;
  document.getElementById('branchCode').value = b.code;
  document.getElementById('branchLocation').value = b.location||'';
  document.getElementById('branchManager').value = b.manager||'';
  document.getElementById('branchContact').value = b.contact||'';
  document.getElementById('branchPassword').value = '';
  document.getElementById('branchPasswordConfirm').value = '';
  document.getElementById('branchStatus').value = b.status;
  document.getElementById('branchNotes').value = b.notes||'';

  // Make password optional on edit
  document.getElementById('branchPassword').removeAttribute('required');
  document.getElementById('branchPasswordConfirm').removeAttribute('required');

  // ── STATUS RESTRICTION ──
  // Only the currently logged-in branch can change its own Active/Inactive status.
  const statusSel = document.getElementById('branchStatus');
  const statusNote = document.getElementById('branchStatusNote');
  const isCurrentBranch = currentBranch && currentBranch.id === id;

  if (!isCurrentBranch) {
    statusSel.disabled = true;
    statusSel.title = 'Only the currently logged-in branch can change its own status.';
    if (statusNote) statusNote.style.display = '';
  } else {
    statusSel.disabled = false;
    statusSel.title = '';
    if (statusNote) statusNote.style.display = 'none';
  }

  openModal('branchModal');
}

function deleteBranch(id) {
  const b = state.branches.find(x=>x.id===id);
  if (!b) return;
  if (currentBranch?.id===id) { toast('Cannot delete the currently active branch','error'); return; }
  const empCount = state.employees.filter(e=>e.branchId===id).length;
  if (!confirm(`Delete branch "${b.name}"?${empCount>0?` This branch has ${empCount} employees.`:''}`)) return;
  state.branches = state.branches.filter(x=>x.id!==id);
  save(); renderBranches(); populateSelects(); populateLoginBranches();
  toast('Branch deleted','info');
}

function openChangePw(id) {
  changePwBranchId = id;
  const b = state.branches.find(x=>x.id===id);
  document.getElementById('changePwBranchName').textContent = '🏢 '+b?.name;
  document.getElementById('changePwCurrent').value='';
  document.getElementById('changePwNew').value='';
  document.getElementById('changePwConfirm').value='';
  openModal('changePwModal');
}

function saveChangePassword() {
  const b = state.branches.find(x=>x.id===changePwBranchId);
  if (!b) return;
  const cur = document.getElementById('changePwCurrent').value;
  const nw = document.getElementById('changePwNew').value;
  const cf = document.getElementById('changePwConfirm').value;
  if (cur !== b.password) { toast('Current password is incorrect','error'); return; }
  if (!nw) { toast('New password cannot be empty','error'); return; }
  if (nw !== cf) { toast('New passwords do not match','error'); return; }
  b.password = nw;
  if (currentBranch?.id===b.id) currentBranch.password = nw;
  save(); renderBranches();
  closeModal('changePwModal');
  toast('Password updated successfully','success');
}

/* ═══════════ BIOMETRIC ENROLLMENT ═══════════ */
function startEnroll() {
  const empId=document.getElementById('bioEmpSelect').value;
  if(!empId){toast('Select an employee first','error');return;}
  const finger=document.getElementById('bioFinger').value;
  const ring=document.getElementById('fpRing'),icon=document.getElementById('fpIcon');
  const lbl=document.getElementById('scannerLabel'),sts=document.getElementById('scannerStatus');
  ['step0','step1','step2'].forEach(id=>{const d=document.getElementById(id);if(d)d.className='step-dot';});
  ring.className='fingerprint-ring scanning'; icon.textContent='👆';
  lbl.textContent='Place '+finger.replace('_',' ')+' on scanner...'; sts.textContent='SCANNING...';
  let s=0; clearInterval(enrollTimer);
  enrollTimer=setInterval(()=>{
    s++;
    if(s===1){setStep(0,'active');sts.textContent='READING (1/3)...'}
    if(s===2){setStep(0,'done');setStep(1,'active');sts.textContent='READING (2/3)...'}
    if(s===3){setStep(1,'done');setStep(2,'active');sts.textContent='READING (3/3)...'}
    if(s===4){
      clearInterval(enrollTimer); setStep(2,'done');
      ring.className='fingerprint-ring success'; icon.textContent='✅';
      lbl.textContent='Enrollment successful!'; sts.textContent='ENROLLED';
      let bio=state.biometrics.find(b=>b.empId===empId);
      if(!bio){bio={empId,fingers:[],enrolledAt:new Date().toISOString()};state.biometrics.push(bio);}
      if(!bio.fingers.includes(finger))bio.fingers.push(finger);
      save(); renderEnrolled(); toast('Fingerprint enrolled!','success');
    }
  },900);
}
function setStep(i,cls){const d=document.getElementById('step'+i);if(d)d.className='step-dot'+(cls?' '+cls:'');}
function resetEnroll(){
  clearInterval(enrollTimer);
  ['step0','step1','step2'].forEach(id=>{const d=document.getElementById(id);if(d)d.className='step-dot';});
  document.getElementById('fpRing').className='fingerprint-ring';
  document.getElementById('fpIcon').textContent='☁';
  document.getElementById('scannerLabel').textContent='Select employee to begin enrollment';
  document.getElementById('scannerStatus').textContent='IDLE';
}
function renderEnrolled(){
  const tbody=document.getElementById('enrolledTable'),empty=document.getElementById('enrolledEmpty');
  const bios = currentBranch ? state.biometrics.filter(b=>{const e=state.employees.find(x=>x.id===b.empId);return e&&e.branchId===currentBranch.id;}) : state.biometrics;
  if(!bios.length){tbody.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  tbody.innerHTML=bios.map(b=>{
    const emp=state.employees.find(e=>e.id===b.empId); if(!emp)return'';
    return `<tr><td><strong>${emp.fname} ${emp.lname}</strong><br><span class="text-sm">${emp.id}</span></td>
      <td>${b.fingers.map(f=>`<span class="chip">${f.replace('_',' ')}</span>`).join(' ')}</td>
      <td class="mono">${new Date(b.enrolledAt).toLocaleDateString('en-PH')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="deleteBio('${b.empId}')">🗑</button></td></tr>`;
  }).join('');
}
function deleteBio(empId){
  if(!confirm('Remove biometric enrollment?'))return;
  state.biometrics=state.biometrics.filter(b=>b.empId!==empId);
  save(); renderEnrolled(); toast('Biometric removed','info');
}

/* ═══════════ CLOCK IN/OUT ═══════════ */
function doBioScan(action){
  const empId=document.getElementById('clockEmp').value;
  if(!empId){toast('Select employee first','error');return;}
  const bio=state.biometrics.find(b=>b.empId===empId);
  const ring=document.getElementById('clockFpRing'),icon=document.getElementById('clockFpIcon');
  const lbl=document.getElementById('clockLabel'),sts=document.getElementById('clockStatus');
  ring.className='fingerprint-ring scanning'; icon.textContent='👆';
  lbl.textContent='Scanning fingerprint...'; sts.textContent='VERIFYING...';
  setTimeout(()=>{
    const confidence=(70+Math.floor(Math.random()*29))+'%';
    ring.className='fingerprint-ring success'; icon.textContent='✅';
    lbl.textContent='Verified!'; sts.textContent='AUTH OK';
    recordClockAction(empId,action,bio?.fingers[0]||'manual',confidence);
    setTimeout(()=>{ring.className='fingerprint-ring';icon.textContent='☁';lbl.textContent='Select employee then scan';sts.textContent='READY';closeModal('clockModal');},2000);
  },1800);
}
function doManualPin(){
  const empId=document.getElementById('clockEmp').value;
  const pin=document.getElementById('clockPin').value;
  if(!empId){toast('Select employee','error');return;}
  if(!pin||pin.length<4){toast('Enter 4-digit PIN','error');return;}
  const emp=state.employees.find(e=>e.id===empId);
  if(!emp||emp.pin!==pin){toast('Invalid PIN','error');return;}
  const today=today_str();
  const existing=state.attendance.find(a=>a.empId===empId&&a.date===today);
  const action=(!existing||existing.timeOut)?'in':'out';
  recordClockAction(empId,action,'pin','manual');
  document.getElementById('clockPin').value=''; closeModal('clockModal');
}
function recordClockAction(empId,action,finger,confidence){
  const now=new Date(),today=today_str();
  const timeStr=now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  state.bioLogs.push({empId,time:now.toISOString(),action,finger,confidence});
  const existing=state.attendance.find(a=>a.empId===empId&&a.date===today);
  const emp=state.employees.find(e=>e.id===empId);
  if(action==='in'){
    if(existing){toast(emp.fname+' already clocked in today','error');return;}
    const ws=state.settings.workStart.split(':'),wsMins=parseInt(ws[0])*60+parseInt(ws[1]);
    const nowMins=now.getHours()*60+now.getMinutes();
    const status=nowMins>(wsMins+parseInt(state.settings.grace))?'late':'present';
    state.attendance.push({id:Date.now(),empId,date:today,timeIn:timeStr,timeOut:'',status,otHours:0,method:'biometric',remark:''});
    toast('✅ '+emp.fname+' clocked IN at '+timeStr,'success');
  } else {
    if(!existing||!existing.timeIn){toast(emp.fname+' has no clock-in today','error');return;}
    if(existing.timeOut){toast(emp.fname+' already clocked out','error');return;}
    existing.timeOut=timeStr;
    const we=state.settings.workEnd.split(':'),weMins=parseInt(we[0])*60+parseInt(we[1]);
    const outMins=now.getHours()*60+now.getMinutes();
    existing.otHours=outMins>weMins?((outMins-weMins)/60).toFixed(2)*1:0;
    toast('👋 '+emp.fname+' clocked OUT at '+timeStr,'success');
  }
  save(); renderAttendance(); renderDashboard(); updateBadge();
}

/* ═══════════ ATTENDANCE ═══════════ */
function attTab(tab,el){
  currentAttTab=tab;
  document.querySelectorAll('#pg-attendance .tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active'); renderAttendance();
}
function renderAttendance(){
  const search=(document.getElementById('attSearch')?.value||'').toLowerCase();
  const today=today_str();
  const weekAgo=new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const monthAgo=new Date(); monthAgo.setDate(monthAgo.getDate()-30);

  const branchEmpIds = currentBranch ? new Set(state.employees.filter(e=>e.branchId===currentBranch.id).map(e=>e.id)) : null;

  let rows=state.attendance.filter(a=>{
    if(branchEmpIds&&!branchEmpIds.has(a.empId)) return false;
    if(currentAttTab==='today') return a.date===today;
    if(currentAttTab==='week') return new Date(a.date)>=weekAgo;
    if(currentAttTab==='month') return new Date(a.date)>=monthAgo;
    return true;
  });
  if(search) rows=rows.filter(a=>{const emp=state.employees.find(e=>e.id===a.empId);return emp&&(emp.fname+' '+emp.lname+' '+emp.id).toLowerCase().includes(search);});
  rows.sort((a,b)=>b.date.localeCompare(a.date));

  const present=rows.filter(r=>r.status==='present'||r.status==='late').length;
  const late=rows.filter(r=>r.status==='late').length;
  const totalH=rows.reduce((s,r)=>{if(r.timeIn&&r.timeOut){const h=timeToMin(r.timeOut)-timeToMin(r.timeIn);return s+(h>0?h/60:0);}return s;},0);
  let absent=0;
  if(currentAttTab==='today'){
    const presentToday=new Set(state.attendance.filter(a=>a.date===today&&(!branchEmpIds||branchEmpIds.has(a.empId))).map(a=>a.empId));
    const activeEmps = branchEmpIds ? state.employees.filter(e=>e.status==='active'&&branchEmpIds.has(e.id)) : state.employees.filter(e=>e.status==='active');
    absent=activeEmps.filter(e=>!presentToday.has(e.id)).length;
  }

  document.getElementById('attPresent').textContent=present;
  document.getElementById('attLate').textContent=late;
  document.getElementById('attAbsent').textContent=absent||'-';
  document.getElementById('attHours').textContent=totalH.toFixed(1)+'h';
  document.getElementById('attCount').textContent=rows.length+' records';

  const tbody=document.getElementById('attBody');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:rgba(10,10,15,0.3)">No records found</td></tr>';return;}
  tbody.innerHTML=rows.map(a=>{
    const emp=state.employees.find(e=>e.id===a.empId);
    const hours=a.timeIn&&a.timeOut?((timeToMin(a.timeOut)-timeToMin(a.timeIn))/60).toFixed(1):'—';
    const statBadge={present:'badge-green',late:'badge-amber',absent:'badge-red',leave:'badge-blue',halfday:'badge-ink'}[a.status]||'badge-ink';
    return `<tr>
      <td><strong>${emp?emp.fname+' '+emp.lname:a.empId}</strong><br><span class="text-sm">${a.empId}</span></td>
      <td class="mono">${a.date}</td><td class="mono">${a.timeIn||'—'}</td><td class="mono">${a.timeOut||'—'}</td>
      <td class="mono">${hours}</td><td class="mono">${a.otHours>0?'+'+a.otHours+'h':'—'}</td>
      <td><span class="badge ${statBadge}">${a.status}</span></td>
      <td><span class="chip">${a.method||'manual'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="deleteAtt(${a.id})">🗑</button></td>
    </tr>`;
  }).join('');
}
function deleteAtt(id){if(!confirm('Delete this record?'))return;state.attendance=state.attendance.filter(a=>a.id!==id);save();renderAttendance();renderDashboard();updateBadge();toast('Deleted','info');}
function saveManualAtt(){
  const empId=document.getElementById('mAttEmp').value,date=document.getElementById('mAttDate').value;
  if(!empId||!date){toast('Employee and date required','error');return;}
  state.attendance.push({id:Date.now(),empId,date,timeIn:document.getElementById('mAttIn').value,timeOut:document.getElementById('mAttOut').value,status:document.getElementById('mAttStatus').value,otHours:parseFloat(document.getElementById('mAttOT').value)||0,method:'manual',remark:document.getElementById('mAttRemark').value});
  save();renderAttendance();renderDashboard();updateBadge();closeModal('manualAttModal');toast('Entry saved','success');
}
function exportAttCSV(){
  const h='Employee ID,Name,Date,Time In,Time Out,Hours,OT,Status,Method\n';
  const r=state.attendance.map(a=>{const emp=state.employees.find(e=>e.id===a.empId);const hrs=a.timeIn&&a.timeOut?((timeToMin(a.timeOut)-timeToMin(a.timeIn))/60).toFixed(2):'0';return[a.empId,emp?emp.fname+' '+emp.lname:'',a.date,a.timeIn,a.timeOut,hrs,a.otHours,a.status,a.method].join(',');}).join('\n');
  downloadCSV('attendance_export.csv',h+r);
}
function updateBadge(){
  const today=today_str();
  const branchEmpIds = currentBranch ? new Set(state.employees.filter(e=>e.branchId===currentBranch.id&&e.status==='active').map(e=>e.id)) : null;
  const present=new Set(state.attendance.filter(a=>a.date===today&&a.timeIn&&(!branchEmpIds||branchEmpIds.has(a.empId))).map(a=>a.empId)).size;
  const active = branchEmpIds ? branchEmpIds.size : state.employees.filter(e=>e.status==='active').length;
  const absent=Math.max(0,active-present);
  const nb=document.getElementById('nbPending');
  if(nb){nb.textContent=absent>0?absent:'0';nb.style.display=absent>0?'':'none';}
}

/* ═══════════ EMPLOYEES ═══════════ */
function renderEmployees(){
  const search=(document.getElementById('empSearch')?.value||'').toLowerCase();
  let emps = currentBranch ? state.employees.filter(e=>e.branchId===currentBranch.id) : state.employees;
  if(search) emps=emps.filter(e=>(e.fname+' '+e.lname+' '+e.id+' '+e.dept).toLowerCase().includes(search));
  const tbody=document.getElementById('empBody');
  if(!emps.length){tbody.innerHTML='<tr><td colspan="11" style="text-align:center;padding:30px;color:rgba(10,10,15,0.3)">No employees found</td></tr>';return;}
  tbody.innerHTML=emps.map(e=>{
    const statBadge=e.status==='active'?'badge-green':e.status==='inactive'?'badge-red':'badge-amber';
    const hasBio=state.biometrics.some(b=>b.empId===e.id)?'<span class="chip" style="background:rgba(0,200,150,0.1);color:var(--green-dark)">👆</span>':'';
    const branch=state.branches.find(b=>b.id===e.branchId);
    return `<tr>
      <td class="mono">${e.id}</td>
      <td><strong>${e.fname} ${e.lname}</strong> ${hasBio}</td>
      <td>${branch?`<span class="dept-tag" style="background:rgba(59,111,255,0.08)">${branch.name}</span>`:'<span class="text-sm">—</span>'}</td>
      <td><span class="dept-tag">${e.dept}</span></td>
      <td>${e.pos}</td><td class="mono">₱${(e.dayRate||0).toLocaleString()}</td>
      <td class="mono text-sm">${e.sss||'—'}</td><td class="mono text-sm">${e.ph||'—'}</td><td class="mono text-sm">${e.pi||'—'}</td>
      <td><span class="badge ${statBadge}">${e.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="editEmp('${e.id}')">✏</button> <button class="btn btn-ghost btn-sm" onclick="deleteEmp('${e.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}
function saveEmployee(){
  const emp={
    id:document.getElementById('empId').value.trim(),fname:document.getElementById('empFname').value.trim(),
    lname:document.getElementById('empLname').value.trim(),pos:document.getElementById('empPos').value.trim(),
    dept:document.getElementById('empDept').value,type:document.getElementById('empType').value,
    dayRate:parseFloat(document.getElementById('empDayRate').value)||0,
    pin:document.getElementById('empPin').value.trim(),
    hired:document.getElementById('empHired').value,status:document.getElementById('empStatus').value,
    sss:document.getElementById('empSSS').value.trim(),ph:document.getElementById('empPH').value.trim(),
    pi:document.getElementById('empPI').value.trim(),tin:document.getElementById('empTIN').value.trim(),
    branchId:document.getElementById('empBranch').value||currentBranch?.id||''
  };
  if(!emp.id||!emp.fname||!emp.lname){toast('ID, First and Last name required','error');return;}
  if(editEmpId){const i=state.employees.findIndex(e=>e.id===editEmpId);if(i>=0)state.employees[i]={...state.employees[i],...emp,id:editEmpId};}
  else{if(state.employees.some(e=>e.id===emp.id)){toast('Employee ID already exists','error');return;}state.employees.push(emp);}
  save();refreshAll();closeModal('empModal');toast(editEmpId?'Employee updated':'Employee added','success');editEmpId=null;
}
function editEmp(id){
  const e=state.employees.find(emp=>emp.id===id); if(!e)return;
  editEmpId=id;
  document.getElementById('empModalTitle').textContent='Edit Employee';
  document.getElementById('empId').value=e.id;document.getElementById('empFname').value=e.fname;
  document.getElementById('empLname').value=e.lname;document.getElementById('empPos').value=e.pos;
  document.getElementById('empDept').value=e.dept;document.getElementById('empType').value=e.type;
  document.getElementById('empDayRate').value=e.dayRate;document.getElementById('empPin').value=e.pin||'';
  document.getElementById('empHired').value=e.hired;document.getElementById('empStatus').value=e.status;
  document.getElementById('empSSS').value=e.sss||'';document.getElementById('empPH').value=e.ph||'';
  document.getElementById('empPI').value=e.pi||'';document.getElementById('empTIN').value=e.tin||'';
  document.getElementById('empBranch').value=e.branchId||'';
  openModal('empModal');
}
function deleteEmp(id){
  if(!confirm('Delete this employee?'))return;
  state.employees=state.employees.filter(e=>e.id!==id);
  state.attendance=state.attendance.filter(a=>a.empId!==id);
  state.biometrics=state.biometrics.filter(b=>b.empId!==id);
  save();refreshAll();toast('Employee deleted','info');
}

/* ═══════════ PAYROLL ═══════════ */
function computePayroll(){
  const from=document.getElementById('payFrom').value,to=document.getElementById('payTo').value;
  if(!from||!to){toast('Select pay period dates','error');return;}
  if(from>to){toast('From date must be before To date','error');return;}
  const dept=document.getElementById('payDept').value;
  const cfg=state.settings;
  let emps=state.employees.filter(e=>e.status==='active');
  if(currentBranch) emps=emps.filter(e=>e.branchId===currentBranch.id);
  if(dept!=='all') emps=emps.filter(e=>e.dept===dept);

  payrollRows=emps.map(emp=>{
    const atts=state.attendance.filter(a=>a.empId===emp.id&&a.date>=from&&a.date<=to&&(a.status==='present'||a.status==='late'||a.status==='halfday'));
    const daysPresent=atts.filter(a=>a.status!=='halfday').length+atts.filter(a=>a.status==='halfday').length*0.5;
    const otHours=atts.reduce((s,a)=>s+(a.otHours||0),0);
    const dailyRate=emp.dayRate||0;
    const basicPay=daysPresent*dailyRate,otPay=otHours*(dailyRate/8)*cfg.ot,gross=basicPay+otPay;
    const sss=computeSSS(gross),ph=Math.min(gross*0.025,2500),pi=Math.min(gross*0.02,100);
    const taxableIncome=gross-sss-ph-pi,tax=Math.max(0,taxableIncome*(cfg.tax/100));
    const addlDeds=state.deductions.filter(d=>d.empId===emp.id&&d.status!=='completed');
    const addlTotal=addlDeds.reduce((s,d)=>s+parseFloat(d.amount||0),0);
    const totalDed=sss+ph+pi+tax+addlTotal,netPay=Math.max(0,gross-totalDed);
    return{empId:emp.id,empName:emp.fname+' '+emp.lname,dept:emp.dept,daysPresent,otHours,basicPay,otPay,gross,sss,ph,pi,tax,addlTotal,totalDed,netPay};
  });

  const tG=payrollRows.reduce((s,r)=>s+r.gross,0),tN=payrollRows.reduce((s,r)=>s+r.netPay,0),tD=payrollRows.reduce((s,r)=>s+r.totalDed,0);
  document.getElementById('payrollSummaryBody').innerHTML=`
    <div class="payslip-row" style="border-color:var(--border)"><span>Period</span><span class="mono">${from} → ${to}</span></div>
    <div class="payslip-row" style="border-color:var(--border)"><span>Branch</span><span class="fw-700">${currentBranch?.name||'All'}</span></div>
    <div class="payslip-row" style="border-color:var(--border)"><span>Employees</span><span class="fw-700">${payrollRows.length}</span></div>
    <div class="payslip-row" style="border-color:var(--border)"><span class="earning">Total Gross</span><span class="fw-700 earning">₱${tG.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</span></div>
    <div class="payslip-row" style="border-color:var(--border)"><span class="deduction">Total Deductions</span><span class="fw-700 deduction">₱${tD.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</span></div>
    <div class="payslip-row total"><span>Total Net Pay</span><span>₱${tN.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</span></div>`;

  document.getElementById('payrollBody').innerHTML=payrollRows.map(r=>`<tr>
    <td><strong>${r.empName}</strong></td><td><span class="dept-tag">${r.dept}</span></td>
    <td class="mono">${r.daysPresent}</td><td class="mono">₱${r.basicPay.toFixed(2)}</td>
    <td class="mono">${r.otHours>0?'+'+r.otHours+'h / ₱'+r.otPay.toFixed(2):'—'}</td>
    <td class="mono fw-700">₱${r.gross.toFixed(2)}</td>
    <td class="mono text-sm deduction">₱${r.sss.toFixed(2)}</td><td class="mono text-sm deduction">₱${r.ph.toFixed(2)}</td>
    <td class="mono text-sm deduction">₱${r.pi.toFixed(2)}</td><td class="mono text-sm deduction">₱${r.tax.toFixed(2)}</td>
    <td class="mono text-sm deduction">${r.addlTotal>0?'₱'+r.addlTotal.toFixed(2):'—'}</td>
    <td class="mono fw-700 text-green">₱${r.netPay.toFixed(2)}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="showPayslip('${r.empId}','${from}','${to}')">📄</button></td>
  </tr>`).join('');
  document.getElementById('payrollTableCard').style.display='';
  toast('Payroll computed for '+payrollRows.length+' employees','success');
}
function computeSSS(salary){
  const brackets=[[4250,180],[4750,202.5],[5250,225],[5750,247.5],[6250,270],[6750,292.5],[7250,315],[7750,337.5],[8250,360],[8750,382.5],[9250,405],[9750,427.5],[10250,450],[10750,472.5],[11250,495],[11750,517.5],[12250,540],[12750,562.5],[13250,585],[13750,607.5],[14250,630],[14750,652.5],[15250,675],[15750,697.5],[16250,720],[16750,742.5],[17250,765],[17750,787.5],[18250,810],[18750,832.5],[19250,855],[19750,877.5],[20250,900],[20750,922.5],[21250,945],[21750,967.5],[22250,990],[22750,1012.5],[23250,1035],[23750,1057.5],[24250,1080],[24750,1102.5],[25250,1125],[25750,1147.5],[26250,1170],[26750,1192.5],[27250,1215],[27750,1237.5],[28250,1260],[28750,1282.5],[29250,1305],[29750,1350]];
  for(const[t,c]of brackets){if(salary<t+500)return c;} return 1350;
}
function finalizePayroll(){
  const from=document.getElementById('payFrom').value,to=document.getElementById('payTo').value,period=from+' to '+to;
  if(!payrollRows.length){toast('Compute payroll first','error');return;}
  if(!confirm('Finalize payroll for period '+period+'?'))return;
  payrollRows.forEach(r=>state.payrolls.push({...r,period,paidAt:new Date().toISOString(),status:'paid',branchId:currentBranch?.id||''}));
  save();renderPayslips();populateSelects();renderDashboard();
  document.getElementById('payrollTableCard').style.display='none';
  toast('Payroll finalized','success'); payrollRows=[];
}
function exportPayrollCSV(){
  if(!payrollRows.length){toast('Compute payroll first','error');return;}
  const h='Employee,Dept,Days,Basic,OT,Gross,SSS,PhilHealth,PagIBIG,Tax,Other,Net Pay\n';
  const r=payrollRows.map(x=>[x.empName,x.dept,x.daysPresent,x.basicPay.toFixed(2),x.otPay.toFixed(2),x.gross.toFixed(2),x.sss.toFixed(2),x.ph.toFixed(2),x.pi.toFixed(2),x.tax.toFixed(2),x.addlTotal.toFixed(2),x.netPay.toFixed(2)].join(',')).join('\n');
  downloadCSV('payroll_export.csv',h+r);
}

/* ═══════════ PAYSLIP ═══════════ */
function renderPayslips(){
  const search=(document.getElementById('slipSearch')?.value||'').toLowerCase();
  const period=document.getElementById('slipPeriodFilter')?.value||'all';
  let slips=state.payrolls;
  if(currentBranch) slips=slips.filter(s=>!s.branchId||s.branchId===currentBranch.id||state.employees.find(e=>e.id===s.empId)?.branchId===currentBranch.id);
  if(period!=='all') slips=slips.filter(s=>s.period===period);
  if(search) slips=slips.filter(s=>s.empName.toLowerCase().includes(search)||s.empId.toLowerCase().includes(search));
  slips.sort((a,b)=>b.paidAt.localeCompare(a.paidAt));
  const tbody=document.getElementById('slipBody');
  if(!slips.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;color:rgba(10,10,15,0.3)">No payslips found</td></tr>';return;}
  tbody.innerHTML=slips.map((s,i)=>`<tr>
    <td><strong>${s.empName}</strong><br><span class="text-sm">${s.empId}</span></td>
    <td class="mono">${s.period}</td><td class="mono earning">₱${s.gross.toFixed(2)}</td>
    <td class="mono deduction">₱${s.totalDed.toFixed(2)}</td>
    <td class="mono fw-700 text-green">₱${s.netPay.toFixed(2)}</td>
    <td><span class="badge badge-green">paid</span></td>
    <td><button class="btn btn-ghost btn-sm" onclick="showPayslipById(${i},'${period}')">📄 View</button></td>
  </tr>`).join('');
}
function showPayslipById(idx,period){
  let slips=state.payrolls;
  if(period&&period!=='all') slips=slips.filter(s=>s.period===period);
  slips.sort((a,b)=>b.paidAt.localeCompare(a.paidAt));
  const s=slips[idx]; if(!s)return;
  renderPayslipModal(s,state.employees.find(e=>e.id===s.empId),state.settings);
}
function showPayslip(empId,from,to){
  const r=payrollRows.find(r=>r.empId===empId); if(!r)return;
  renderPayslipModal({...r,period:from+' to '+to,status:'preview'},state.employees.find(e=>e.id===empId),state.settings);
}

/* ── PAYSLIP MODAL RENDERER ─────────────────────────────────────────────
   PATCH 1: Added tagline line below company address in payslip header.
   Tagline is pulled from cfg.tagline (saved in settings), defaulting to
   'MASARAP PERO HINDI MAHAL' if not set.
   ─────────────────────────────────────────────────────────────────────── */
function renderPayslipModal(s,emp,cfg){
  document.getElementById('payslipContent').innerHTML=`
    <div class="payslip">
      <div class="payslip-header">
        <div>
          <div class="payslip-title">${cfg.company||'Company'}</div>
          <div class="payslip-period">${cfg.address||''}</div>
          <div style="font-size:11px;opacity:0.5;font-style:italic;letter-spacing:0.5px;margin-top:2px">${cfg.tagline||'MASARAP PERO HINDI MAHAL'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'DM Mono',monospace;font-size:12px;opacity:.6">PAYSLIP</div>
          <div style="font-size:16px;font-weight:700">${s.period}</div>
        </div>
      </div>
      <div class="payslip-body">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:4px">
          <div>
            <div style="font-size:18px;font-weight:700">${s.empName||emp?.fname+' '+emp?.lname||'—'}</div>
            <div class="text-sm">${emp?.pos||'—'} · ${emp?.dept||'—'}</div>
            <div class="text-sm mt-4">ID: ${s.empId||emp?.id||'—'}</div>
          </div>
          <div style="text-align:right">
            <div class="text-sm">SSS: ${emp?.sss||'—'}</div>
            <div class="text-sm">PhilHealth: ${emp?.ph||'—'}</div>
            <div class="text-sm">Pag-IBIG: ${emp?.pi||'—'}</div>
            <div class="text-sm">TIN: ${emp?.tin||'—'}</div>
          </div>
        </div>
        <div class="payslip-section-title">Earnings</div>
        <div class="payslip-row"><span>Days Worked</span><span class="mono">${s.daysPresent}</span></div>
        <div class="payslip-row earning"><span>Basic Pay</span><span class="mono">₱${(s.basicPay||0).toFixed(2)}</span></div>
        ${s.otHours>0?`<div class="payslip-row earning"><span>Overtime (${s.otHours}h)</span><span class="mono">₱${(s.otPay||0).toFixed(2)}</span></div>`:''}
        <div class="payslip-row" style="font-weight:700;border-top:1px solid var(--border)"><span>Gross Pay</span><span class="mono">₱${(s.gross||0).toFixed(2)}</span></div>
        <div class="payslip-section-title">Deductions</div>
        <div class="payslip-row deduction"><span>SSS Contribution</span><span class="mono">₱${(s.sss||0).toFixed(2)}</span></div>
        <div class="payslip-row deduction"><span>PhilHealth (2.5%)</span><span class="mono">₱${(s.ph||0).toFixed(2)}</span></div>
        <div class="payslip-row deduction"><span>Pag-IBIG (2%)</span><span class="mono">₱${(s.pi||0).toFixed(2)}</span></div>
        <div class="payslip-row deduction"><span>Withholding Tax (${cfg.tax||5}%)</span><span class="mono">₱${(s.tax||0).toFixed(2)}</span></div>
        ${s.addlTotal>0?`<div class="payslip-row deduction"><span>Other Deductions</span><span class="mono">₱${(s.addlTotal||0).toFixed(2)}</span></div>`:''}
        <div class="payslip-row" style="font-weight:600;border-top:1px solid var(--border)"><span>Total Deductions</span><span class="mono deduction">₱${(s.totalDed||0).toFixed(2)}</span></div>
        <div class="payslip-row total"><span>NET PAY</span><span class="mono text-green" style="font-size:20px">₱${(s.netPay||0).toFixed(2)}</span></div>
        <div style="margin-top:28px;display:flex;justify-content:space-between;font-size:12px;color:rgba(10,10,15,0.4)">
          <div>Prepared by: _______________<br><span style="font-size:11px">HR Manager</span></div>
          <div>Checked by: _______________<br><span style="font-size:11px">Finance Officer</span></div>
          <div>Approved by: _______________<br><span style="font-size:11px">General Manager/Owner</span></div>
        </div>
      </div>
    </div>`;
  openModal('payslipModal');
}
function printPayslip(){window.print();}

/* ═══════════ DEDUCTIONS ═══════════ */
function renderDeductions(){
  const tbody=document.getElementById('dedBody'),empty=document.getElementById('dedEmpty');
  if(!state.deductions.length){tbody.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  tbody.innerHTML=state.deductions.map((d,i)=>{
    const emp=state.employees.find(e=>e.id===d.empId);
    return `<tr><td>${emp?emp.fname+' '+emp.lname:d.empId}</td><td><span class="chip">${d.type}</span></td>
      <td class="mono deduction">₱${parseFloat(d.amount||0).toFixed(2)}</td>
      <td><span class="badge badge-ink">${d.recurring}</span></td>
      <td>${d.remark||'—'}</td><td class="mono">${d.start||'—'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="deleteDed(${i})">🗑</button></td></tr>`;
  }).join('');
}
function saveDeduction(){
  const empId=document.getElementById('dedEmp').value;
  if(!empId){toast('Select employee','error');return;}
  state.deductions.push({empId,type:document.getElementById('dedType').value,amount:document.getElementById('dedAmt').value,recurring:document.getElementById('dedRecur').value,start:document.getElementById('dedStart').value,remark:document.getElementById('dedRemark').value});
  save();renderDeductions();closeModal('dedModal');toast('Deduction added','success');
}
function deleteDed(i){if(!confirm('Remove this deduction?'))return;state.deductions.splice(i,1);save();renderDeductions();toast('Removed','info');}

/* ═══════════ REPORTS ═══════════ */
function reportTab(tab,el){
  currentReportTab=tab;
  document.querySelectorAll('#pg-reports .tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('report-attendance').style.display=tab==='attendance'?'':'none';
  document.getElementById('report-payroll').style.display=tab==='payroll'?'':'none';
  document.getElementById('report-biometric').style.display=tab==='biometric'?'':'none';
  if(tab==='biometric') renderBioLog();
}
function genAttReport(){
  const from=document.getElementById('rAttFrom').value,to=document.getElementById('rAttTo').value;
  if(!from||!to){toast('Select date range','error');return;}
  const dept=document.getElementById('rAttDept').value;
  let emps=state.employees;
  if(currentBranch) emps=emps.filter(e=>e.branchId===currentBranch.id);
  if(dept!=='all') emps=emps.filter(e=>e.dept===dept);
  const tbody=document.getElementById('rAttBody'),empty=document.getElementById('rAttEmpty');
  empty.style.display='none';
  tbody.innerHTML=emps.map(emp=>{
    const atts=state.attendance.filter(a=>a.empId===emp.id&&a.date>=from&&a.date<=to);
    const present=atts.filter(a=>a.status==='present').length,late=atts.filter(a=>a.status==='late').length;
    const absent=atts.filter(a=>a.status==='absent').length;
    const totalH=atts.reduce((s,a)=>a.timeIn&&a.timeOut?s+(timeToMin(a.timeOut)-timeToMin(a.timeIn))/60:s,0);
    const otH=atts.reduce((s,a)=>s+(a.otHours||0),0);
    const workDays=daysBetween(from,to),rate=workDays>0?Math.min(100,Math.round(((present+late)/workDays)*100)):0;
    return `<tr>
      <td><strong>${emp.fname} ${emp.lname}</strong></td><td><span class="dept-tag">${emp.dept}</span></td>
      <td class="mono text-green">${present+late}</td><td class="mono" style="color:var(--amber)">${late}</td>
      <td class="mono deduction">${absent}</td><td class="mono">${totalH.toFixed(1)}h</td>
      <td class="mono">${otH>0?'+'+otH.toFixed(1)+'h':'—'}</td>
      <td><div class="mono">${rate}%</div><div class="progress-bar"><div class="progress-fill${rate<70?' red':rate<85?' amber':''}" style="width:${rate}%"></div></div></td>
    </tr>`;
  }).join('');
}
function exportAttReport(){genAttReport();const from=document.getElementById('rAttFrom').value,to=document.getElementById('rAttTo').value;const rows=state.employees.map(emp=>{const atts=state.attendance.filter(a=>a.empId===emp.id&&a.date>=from&&a.date<=to);return[emp.id,emp.fname+' '+emp.lname,emp.dept,atts.filter(a=>a.status==='present').length,atts.filter(a=>a.status==='late').length,atts.filter(a=>a.status==='absent').length].join(',');});downloadCSV('attendance_report.csv','ID,Name,Dept,Present,Late,Absent\n'+rows.join('\n'));}
function genPayrollReport(){
  const period=document.getElementById('rPayPeriod').value;
  let slips=state.payrolls;
  if(period!=='all') slips=slips.filter(s=>s.period===period);
  const empty=document.getElementById('rPayEmpty'),tbody=document.getElementById('rPayBody');
  if(!slips.length){tbody.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  tbody.innerHTML=slips.map(s=>`<tr>
    <td><strong>${s.empName}</strong></td><td class="mono">${s.period}</td>
    <td class="mono earning">₱${s.gross.toFixed(2)}</td><td class="mono deduction">₱${s.sss.toFixed(2)}</td>
    <td class="mono deduction">₱${s.ph.toFixed(2)}</td><td class="mono deduction">₱${s.pi.toFixed(2)}</td>
    <td class="mono deduction">₱${s.tax.toFixed(2)}</td><td class="mono fw-700 text-green">₱${s.netPay.toFixed(2)}</td>
  </tr>`).join('');
}
function exportPayrollReport(){const period=document.getElementById('rPayPeriod').value;let slips=state.payrolls;if(period!=='all')slips=slips.filter(s=>s.period===period);downloadCSV('payroll_report.csv','Employee,Period,Gross,SSS,PhilHealth,PagIBIG,Tax,Net Pay\n'+slips.map(s=>[s.empName,s.period,s.gross.toFixed(2),s.sss.toFixed(2),s.ph.toFixed(2),s.pi.toFixed(2),s.tax.toFixed(2),s.netPay.toFixed(2)].join(',')).join('\n'));}
function renderBioLog(){
  const empty=document.getElementById('rBioEmpty'),tbody=document.getElementById('rBioBody');
  if(!state.bioLogs.length){tbody.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  const logs=[...state.bioLogs].reverse().slice(0,50);
  tbody.innerHTML=logs.map(l=>{
    const emp=state.employees.find(e=>e.id===l.empId);
    return `<tr><td>${emp?emp.fname+' '+emp.lname:l.empId}</td>
      <td class="mono">${new Date(l.time).toLocaleString('en-PH')}</td>
      <td><span class="badge ${l.action==='in'?'badge-green':'badge-amber'}">${l.action==='in'?'Clock In':'Clock Out'}</span></td>
      <td class="mono">${l.finger?.replace('_',' ')||'—'}</td><td class="mono">${l.confidence||'—'}</td></tr>`;
  }).join('');
}

/* ═══════════ DASHBOARD ═══════════ */
function renderDashboard(){
  const today=today_str();
  const branchEmpIds = currentBranch ? new Set(state.employees.filter(e=>e.branchId===currentBranch.id).map(e=>e.id)) : null;
  const activeEmps = branchEmpIds ? state.employees.filter(e=>e.status==='active'&&branchEmpIds.has(e.id)) : state.employees.filter(e=>e.status==='active');
  const todayAtts=state.attendance.filter(a=>a.date===today&&(!branchEmpIds||branchEmpIds.has(a.empId)));
  const presentIds=new Set(todayAtts.filter(a=>a.status==='present'||a.status==='late').map(a=>a.empId));
  const lateCount=todayAtts.filter(a=>a.status==='late').length;
  const absent=activeEmps.filter(e=>!presentIds.has(e.id)).length;
  document.getElementById('dTotalEmp').textContent=activeEmps.length;
  document.getElementById('dPresent').textContent=presentIds.size;
  document.getElementById('dLate').textContent=lateCount;
  document.getElementById('dAbsent').textContent=absent;

  const tbody=document.getElementById('dashAttBody');
  if(todayAtts.length){
    tbody.innerHTML=todayAtts.slice(0,8).map(a=>{
      const emp=state.employees.find(e=>e.id===a.empId);
      return `<tr><td>${emp?emp.fname+' '+emp.lname:a.empId}</td><td class="mono">${a.timeIn||'—'}</td>
        <td><span class="badge ${a.status==='late'?'badge-amber':'badge-green'}">${a.status}</span></td></tr>`;
    }).join('');
  } else tbody.innerHTML='<tr><td colspan="3" style="text-align:center;padding:20px;color:rgba(10,10,15,0.3)">No attendance today</td></tr>';

  const depts=[...new Set(activeEmps.map(e=>e.dept))];
  const monthAgo=new Date(); monthAgo.setDate(monthAgo.getDate()-30);
  const monthAtts=state.attendance.filter(a=>new Date(a.date)>=monthAgo&&(!branchEmpIds||branchEmpIds.has(a.empId)));
  document.getElementById('deptRates').innerHTML=depts.map(dept=>{
    const deptEmps=activeEmps.filter(e=>e.dept===dept);
    const deptAtts=monthAtts.filter(a=>deptEmps.some(e=>e.id===a.empId)&&(a.status==='present'||a.status==='late'));
    const rate=deptEmps.length>0?Math.min(100,Math.round((deptAtts.length/(deptEmps.length*22))*100)):0;
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="dept-tag">${dept}</span><span class="mono text-sm">${rate}%</span></div>
      <div class="progress-bar"><div class="progress-fill${rate<70?' red':rate<85?' amber':''}" style="width:${rate}%"></div></div>
    </div>`;
  }).join('');

  if(state.payrolls.length){
    const periods=[...new Set(state.payrolls.map(p=>p.period))].sort();
    const lastPeriod=periods[periods.length-1];
    let periodSlips=state.payrolls.filter(p=>p.period===lastPeriod);
    if(currentBranch) periodSlips=periodSlips.filter(p=>!p.branchId||p.branchId===currentBranch.id||state.employees.find(e=>e.id===p.empId)?.branchId===currentBranch.id);
    const tN=periodSlips.reduce((s,p)=>s+p.netPay,0),tG=periodSlips.reduce((s,p)=>s+p.gross,0);
    document.getElementById('lastPayrollSummary').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <div><div class="text-sm">Period</div><div class="mono fw-700">${lastPeriod}</div></div>
        <div><div class="text-sm">Total Gross</div><div class="mono fw-700 earning">₱${tG.toFixed(2)}</div></div>
        <div><div class="text-sm">Total Net Pay</div><div class="mono fw-700 text-green" style="font-size:18px">₱${tN.toFixed(2)}</div></div>
      </div>`;
  }
}

/* ═══════════ SETTINGS ═══════════ */
function saveSettings(){
  state.settings={
    ...state.settings,
    company:document.getElementById('cfgCompany').value,
    address:document.getElementById('cfgAddress').value,
    tagline:document.getElementById('cfgTagline').value,
    contact:document.getElementById('cfgContact').value,
    workStart:document.getElementById('cfgWorkStart').value,
    workEnd:document.getElementById('cfgWorkEnd').value,
    grace:parseInt(document.getElementById('cfgGrace').value)||15,
    tax:parseFloat(document.getElementById('cfgTax').value)||5,
    ot:parseFloat(document.getElementById('cfgOT').value)||1.25,
    nd:parseFloat(document.getElementById('cfgND').value)||1.10,
    hol:parseFloat(document.getElementById('cfgHol').value)||2.0,
    deMin:parseFloat(document.getElementById('cfgDeMin').value)||2000,
    thirteenth:document.getElementById('cfgThirteenth').value
  };
  save();
  document.getElementById('loginCompanyName').textContent=state.settings.company;
  toast('Settings saved','success');
}
function saveHRProfile(){
  state.settings.hrName=document.getElementById('cfgHRName').value;
  state.settings.hrRole=document.getElementById('cfgHRRole').value;
  document.getElementById('sideUser').textContent=state.settings.hrName;
  document.getElementById('sideRole').textContent=state.settings.hrRole;
  document.getElementById('sideAvatar').textContent=(state.settings.hrName[0]||'A').toUpperCase();
  save(); toast('Profile saved','success');
}

/* ═══════════ UTILS ═══════════ */
function today_str(){return new Date().toISOString().split('T')[0];}
function minToTime(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function timeToMin(t){if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+(m||0);}
function daysBetween(from,to){const d1=new Date(from),d2=new Date(to);return Math.max(1,Math.round((d2-d1)/(1000*60*60*24)));}
function downloadCSV(filename,content){const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(content);a.download=filename;a.click();}

(function setDefaults(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const from=`${y}-${String(m).padStart(2,'0')}-01`,to=`${y}-${String(m).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const pf=document.getElementById('payFrom');if(pf)pf.value=from;
  const pt=document.getElementById('payTo');if(pt)pt.value=to;
  const mAD=document.getElementById('mAttDate');if(mAD)mAD.value=today_str();
  const rAF=document.getElementById('rAttFrom');if(rAF)rAF.value=from;
  const rAT=document.getElementById('rAttTo');if(rAT)rAT.value=to;
  const dS=document.getElementById('dedStart');if(dS)dS.value=today_str();
})();

init();
