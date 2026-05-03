/**
 * EBudget AI - Core Engine v4.0 (Perfect Edition)
 */

const SUPABASE_URL = 'https://dsambzdkakpztmsfwxee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a37NCM5-9B2J8tcNYDn9kw_eaqC5o0A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    isLogin: true,
    user: null,
    step: 0,
    data: { foyer: 1, revenus: 0, charges: 0, choices: [] },
    bilan: null
};

// --- AUTH & SECURITY ---
async function processAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if(!email || password.length < 6) return alert("Veuillez entrer un email valide et un mot de passe (min 6 car.).");

    let result;
    if(state.isLogin) {
        result = await _supabase.auth.signInWithPassword({ email, password });
    } else {
        result = await _supabase.auth.signUp({ email, password });
        alert("Vérifiez vos emails pour confirmer l'inscription.");
    }
    
    if(result.error) alert(result.error.message);
    else checkSession();
}

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        state.user = session.user;
        document.getElementById('display-email').innerText = state.user.email.split('@')[0];
        document.getElementById('auth-status').classList.remove('hidden');
        showView('view-dashboard');
        loadHistory();
        
        // Reprise automatique si analyse en cours
        const saved = localStorage.getItem(`draft_${state.user.id}`);
        if(saved) {
            if(confirm("Reprendre votre analyse en cours ?")) {
                const parsed = JSON.parse(saved);
                state.step = parsed.step;
                state.data = parsed.data;
                showView('view-quiz');
                renderStep();
            } else {
                localStorage.removeItem(`draft_${state.user.id}`);
            }
        }
    }
}

async function forgotPassword() {
    const email = prompt("Entrez votre email pour recevoir un lien de réinitialisation :");
    if(email) {
        const { error } = await _supabase.auth.resetPasswordForEmail(email);
        alert(error ? error.message : "Lien envoyé !");
    }
}

// --- QUIZ DATA & LOGIC ---
const steps = [
    { id: 'foyer', text: "Composition du foyer", desc: "Combien de personnes dépendent de ce budget ?", icon: 'fa-users', type: 'input' },
    { id: 'salaire', text: "Revenus cumulés", desc: "Total des revenus nets mensuels (Salaires, aides actuelles, etc.)", icon: 'fa-wallet', type: 'input' },
    { id: 'loyer', text: "Logement", desc: "Loyer mensuel ou mensualité de crédit immobilier.", icon: 'fa-house', type: 'input', cat: 'char' },
    { id: 'auto', text: "Transport", desc: "Possédez-vous un véhicule ?", icon: 'fa-car', type: 'choice' },
    { id: 'auto_val', text: "Frais auto", desc: "Assurance, carburant et entretien estimé.", icon: 'fa-gas-pump', type: 'input', cat: 'char', dep: 'auto' },
    { id: 'credit', text: "Prêts en cours", desc: "Avez-vous des crédits à la consommation ?", icon: 'fa-credit-card', type: 'choice' },
    { id: 'credit_val', text: "Dettes", desc: "Mensualité totale prélevée.", icon: 'fa-euro-sign', type: 'input', cat: 'char', dep: 'credit' },
    { id: 'epargne', text: "Objectif Épargne", desc: "Voulez-vous sécuriser 15% de revenus pour vos projets ?", icon: 'fa-piggy-bank', type: 'choice' }
];

function startQuiz() {
    state.step = 0;
    state.data = { foyer: 1, revenus: 0, charges: 0, choices: [] };
    showView('view-quiz');
    renderStep();
}

function renderStep() {
    const s = steps[state.step];
    if(!s) return calculateResults();

    if(s.dep && !state.data.choices.includes(s.dep)) {
        state.step++; return renderStep();
    }

    // Sauvegarde auto du brouillon
    localStorage.setItem(`draft_${state.user.id}`, JSON.stringify({ step: state.step, data: state.data }));

    document.getElementById('progress-bar').style.width = `${(state.step / steps.length) * 100}%`;
    document.getElementById('q-text').innerText = s.text;
    document.getElementById('q-desc').innerText = s.desc;
    document.getElementById('q-icon').innerHTML = `<i class="fa-solid ${s.icon}"></i>`;
    
    const isInput = s.type === 'input';
    document.getElementById('input-wrap').classList.toggle('hidden', !isInput);
    document.getElementById('btn-next').classList.toggle('hidden', !isInput);
    document.getElementById('dual-btns').classList.toggle('hidden', isInput);
    document.getElementById('q-input').value = "";
}

document.getElementById('btn-next').onclick = () => {
    const val = parseFloat(document.getElementById('q-input').value) || 0;
    
    // Validation intelligente
    if(val < 0) return alert("Veuillez entrer un montant positif.");
    
    const s = steps[state.step];
    if(s.id === 'foyer') state.data.foyer = val || 1;
    else if(s.cat === 'char') state.data.charges += val;
    else state.data.revenus += val;

    state.step++;
    renderStep();
};

function handleChoice(yes) {
    if(yes) state.data.choices.push(steps[state.step].id);
    state.step++;
    renderStep();
}

// --- INTELLIGENCE & CALCULS ---
function calculateResults() {
    localStorage.removeItem(`draft_${state.user.id}`);
    showView('view-results');
    
    // Simulation aides sociales (Estimation IA)
    let aides = state.data.revenus < 2900 ? Math.round((2900 - state.data.revenus) * 0.14 * state.data.foyer) : 0;
    
    // Epargne de projet
    const epargne = state.data.choices.includes('epargne') ? Math.round((state.data.revenus + aides) * 0.15) : 0;
    
    // Calcul forfaitaire du coût de la vie (alimentation, hygiène, etc.)
    const coutVie = state.data.foyer * 230; 
    
    const resteFinal = Math.round(state.data.revenus + aides - state.data.charges - epargne - coutVie);

    state.bilan = { res: resteFinal, save: epargne, help: aides, date: new Date().toLocaleDateString() };

    document.getElementById('res-total').innerText = `${resteFinal}€`;
    document.getElementById('res-save').innerText = `${epargne}€`;
    document.getElementById('res-aides').innerText = `+${aides}€`;

    // Conseils IA
    let advice = "";
    const chargeRatio = (state.data.charges / (state.data.revenus + aides)) * 100;

    if(resteFinal < 0) advice = "⚠️ Risque de découvert : Vos charges et besoins vitaux dépassent vos entrées. Priorisez la réduction de vos abonnements et évitez tout nouveau crédit.";
    else if(chargeRatio > 40) advice = "📊 Optimisation : Vos charges fixes sont lourdes (>40%). L'IA suggère de comparer vos contrats d'énergie et assurances pour libérer du pouvoir d'achat.";
    else advice = "💎 Équilibre Parfait : Votre budget est sain. Vous avez une excellente capacité de financement pour vos projets futurs.";

    document.getElementById('ai-advice').innerText = advice;
}

// --- CLOUD SYNC ---
async function saveBilanCloud() {
    const { error } = await _supabase.from('bilans').upsert({
        user_id: state.user.id,
        reste_a_vivre: state.bilan.res,
        data_json: state.bilan
    });
    if(!error) { alert("Bilan archivé !"); showView('view-dashboard'); loadHistory(); }
}

async function loadHistory() {
    const { data } = await _supabase.from('bilans').select('*').eq('user_id', state.user.id).maybeSingle();
    if(data) {
        document.getElementById('history-container').innerHTML = `
            <div class="res-mini-card" style="border-color:var(--primary); text-align:left; animation: fadeIn 1s ease;">
                <p style="font-size:0.7rem; opacity:0.5">Dernière sauvegarde : ${data.data_json.date}</p>
                <h3 style="color:var(--accent)">${data.reste_a_vivre}€ / mois</h3>
            </div>
        `;
    }
}

// --- UTILS ---
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
function toggleAuthMode() {
    state.isLogin = !state.isLogin;
    document.getElementById('auth-title').innerText = state.isLogin ? "Accès Sécurisé" : "Rejoindre l'IA";
    document.getElementById('btn-auth-primary').innerText = state.isLogin ? "Se connecter" : "Créer mon profil";
    document.getElementById('auth-toggle').innerText = state.isLogin ? "Créer un compte" : "Déjà membre ? Se connecter";
}
function resetQuiz() { if(confirm("Annuler l'analyse ?")) { localStorage.removeItem(`draft_${state.user.id}`); showView('view-dashboard'); } }
function handleLogout() { _supabase.auth.signOut(); location.reload(); }

window.onload = checkSession;