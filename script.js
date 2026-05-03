/**
 * EBudget Pro - Version Finale (Édition en direct & Fix Cloud)
 */

// --- CONFIGURATION SUPABASE ---
// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = 'https://dsambzdkakpztmsfwxee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a37NCM5-9B2J8tcNYDn9kw_eaqC5o0A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentStep = 0;
let foyerCount = 1;
let currentPerson = 1;
let data = { rev: [], char: [] };
let choices = [];
let currentBilan = null;

// --- CONFIGURATION DES QUESTIONS ---
const steps = [
    { id: 'foyer', text: "Nombre de personnes avec revenus ?", type: 'input', icon: 'fa-users' },
    { id: 'salaire', text: "Salaire net (Personne n°", type: 'input', icon: 'fa-wallet', loop: true },
    { id: 'apl', text: "Aides (APL, CAF, etc.) ?", type: 'input', icon: 'fa-house-chimney-user' },
    { id: 'loyer', text: "Loyer / Crédit immo ?", type: 'input', icon: 'fa-house-lock', cat: 'char' },
    { id: 'credits', text: "Autres crédits & Assurances ?", type: 'input', icon: 'fa-credit-card', cat: 'char' },
    { id: 'abos', text: "Abonnements & Énergie ?", type: 'input', icon: 'fa-bolt-lightning', cat: 'char' },
    { id: 'transport', text: "Budget Transport ?", type: 'input', icon: 'fa-gas-pump', cat: 'char' },
    { id: 'courses_val', text: "Budget COURSES ?", type: 'input', icon: 'fa-cart-shopping', cat: 'char' },
    { id: 'want_loisirs', text: "Prévoir un budget LOISIRS ?", type: 'choice', icon: 'fa-gamepad' },
    { id: 'loisirs_val', text: "Montant LOISIRS ?", type: 'input', icon: 'fa-mask-ventilator', cat: 'char', dep: 'want_loisirs' },
    { id: 'want_other', text: "Ajouter un AUTRE budget ?", type: 'choice', icon: 'fa-plus-circle' },
    { id: 'other_val', text: "Montant AUTRE ?", type: 'input', icon: 'fa-euro-sign', cat: 'char', dep: 'want_other' },
    { id: 'want_save', text: "Épargner 30% du reste ?", type: 'choice', icon: 'fa-piggy-bank' }
];

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if(target) target.classList.add('active');
    
    const isLogged = (viewId === 'view-dashboard' || viewId === 'view-quiz' || viewId === 'view-results');
    document.getElementById('logout-btn').classList.toggle('hidden', !isLogged);
}

// --- LOGIQUE DU QUIZ ---
function startQuiz() {
    currentStep = 0; currentPerson = 1;
    data = { rev: [], char: [] }; choices = [];
    showView('view-quiz'); updateStep();
}

function updateStep() {
    const step = steps[currentStep];
    if (!step) return showResults();

    if (step.dep && !choices.includes(step.dep)) {
        currentStep++; return updateStep();
    }

    const inputField = document.getElementById('q-input');
    inputField.value = ""; 

    let questionText = step.text;
    if(step.loop) questionText = `${step.text}${currentPerson}) ?`;

    document.getElementById('q-text').innerText = questionText;
    document.getElementById('q-icon').innerHTML = `<i class="fa-solid ${step.icon}"></i>`;
    
    const isInput = step.type === 'input';
    document.getElementById('input-wrap').classList.toggle('hidden', !isInput);
    document.getElementById('btn-next').classList.toggle('hidden', !isInput);
    document.getElementById('dual-btns').classList.toggle('hidden', isInput);

    if(isInput) setTimeout(() => inputField.focus(), 100);
}

document.getElementById('btn-next').onclick = () => {
    const val = parseFloat(document.getElementById('q-input').value) || 0;
    const step = steps[currentStep];

    if (step.id === 'foyer') { foyerCount = val > 0 ? val : 1; currentStep++; } 
    else if (step.loop) {
        data.rev.push({ label: `Salaire P${currentPerson}`, v: val });
        if (currentPerson < foyerCount) currentPerson++; else currentStep++;
    } 
    else {
        if (step.cat === 'char') data.char.push({ label: step.text, v: val });
        else data.rev.push({ label: step.text, v: val });
        currentStep++;
    }
    updateStep();
};

function quizChoice(isYes) {
    if (isYes) choices.push(steps[currentStep].id);
    currentStep++; updateStep();
}

// --- RÉSULTATS & ÉDITION EN DIRECT ---
function showResults() {
    showView('view-results');
    calculateFinal();
}

function calculateFinal() {
    const totalRev = data.rev.reduce((a, b) => a + b.v, 0);
    const totalChar = data.char.reduce((a, b) => a + b.v, 0);
    let reste = totalRev - totalChar;
    
    let html = `
        <div class="res-item edit-zone">
            <span>💰 Revenus :</span>
            <input type="number" value="${totalRev}" onchange="updateLive('rev', this.value)"> €
        </div>
        <div class="res-item edit-zone">
            <span>📉 Dépenses :</span>
            <input type="number" value="${totalChar}" onchange="updateLive('char', this.value)"> €
        </div>
    `;

    if (choices.includes('want_save')) {
        let epargne = reste > 0 ? reste * 0.3 : 0;
        reste -= epargne;
        html += `<div class="res-item" style="color:#00d2d3"><span>💎 Épargne (30%) :</span><b>${Math.round(epargne)}€</b></div>`;
    }

    const totalElement = document.getElementById('res-total');
    totalElement.innerText = `${Math.round(reste)}€`;
    totalElement.style.color = reste < 0 ? "#ff7675" : "white";

    document.getElementById('res-details').innerHTML = html;
    currentBilan = { res: Math.round(reste), date: new Date().toLocaleDateString(), rev: totalRev, char: totalChar };
}

// Fonction pour modifier en direct
window.updateLive = function(type, val) {
    const newVal = parseFloat(val) || 0;
    if(type === 'rev') data.rev = [{v: newVal}]; // On simplifie pour l'édition directe
    else data.char = [{v: newVal}];
    calculateFinal();
};

// --- CLOUD & AUTH ---
async function handleLogin() {
    const email = document.getElementById('email').value.trim().toLowerCase();
    if(!email.includes('@')) return alert("Email invalide");
    document.getElementById('user-status').innerText = `Compte : ${email}`;
    showView('view-dashboard');
    await loadCloudHistory(email);
}

async function loadCloudHistory(email) {
    const recordDiv = document.getElementById('last-record');
    const { data: cloudData, error } = await _supabase.from('bilans').select('*').eq('user_email', email).maybeSingle();
    
    if (cloudData) {
        currentBilan = cloudData.data_json;
        // On remplit les data locales pour permettre l'édition directe sans refaire le quiz
        data.rev = [{v: currentBilan.rev || 0}];
        data.char = [{v: currentBilan.char || 0}];
        recordDiv.innerHTML = `<h3>Reste actuel : ${cloudData.reste_a_vivre}€</h3><p>Cliquer pour modifier</p>`;
    } else {
        recordDiv.innerHTML = `<p>Aucune donnée sauvegardée.</p>`;
    }
}

async function saveAndExit() {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const { error } = await _supabase.from('bilans').upsert({ 
        user_email: email, 
        reste_a_vivre: currentBilan.res, 
        data_json: currentBilan 
    });

    if(!error) {
        alert("Sauvegardé !");
        await loadCloudHistory(email); // On recharge pour mettre à jour l'affichage
        showView('view-dashboard');
    }
}

function showLastResult() { if(currentBilan) showView('view-results'); }
function logout() { location.reload(); }

