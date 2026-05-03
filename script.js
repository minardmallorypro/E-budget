const SUPABASE_URL = 'https://dsambzdkakpztmsfwxee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a37NCM5-9B2J8tcNYDn9kw_eaqC5o0A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    isLogin: true,
    user: null,
    step: 0,
    data: { 
        foyer: 1, 
        situation: '', 
        objectif: '',
        revenus: 0, 
        aides: 0,
        loyer: 0,
        courses: 0,
        charges: 0
    },
    bilan: null
};

// --- AUTHENTIFICATION ---
async function signInWithGoogle() {
    const { error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) alert("Erreur Google : " + error.message);
}

function toggleAuthMode() {
    state.isLogin = !state.isLogin;
    document.getElementById('auth-title').innerText = state.isLogin ? "Accès Sécurisé" : "Créer un profil";
    document.getElementById('btn-auth-primary').innerText = state.isLogin ? "Se connecter" : "S'inscrire";
    document.getElementById('auth-toggle').innerText = state.isLogin ? "Pas encore de compte ? Créer un profil" : "Déjà membre ? Se connecter";
}

async function processAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if(!email || password.length < 6) return alert("Email et mot de passe requis.");
    
    let result = state.isLogin ? 
        await _supabase.auth.signInWithPassword({ email, password }) : 
        await _supabase.auth.signUp({ email, password });
    
    if(result.error) alert(result.error.message);
    else if(state.isLogin) checkSession();
}

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        state.user = session.user;
        document.getElementById('display-email').innerText = state.user.email.split('@')[0];
        document.getElementById('auth-status').classList.remove('hidden');
        showView('view-dashboard');
        loadHistory();
    }
}

// --- CONFIGURATION DES QUESTIONS ---
const steps = [
    { 
        id: 'objectif', 
        text: "Pourquoi ce test ?", 
        desc: "J'adapterai mes conseils selon votre but.", 
        icon: 'fa-bullseye', 
        type: 'select', 
        options: [
            {val: 'difficulte', label: 'Je suis en difficulté'},
            {val: 'gestion', label: 'Mieux gérer mon budget'},
            {val: 'projet', label: 'Préparer un projet'}
        ] 
    },
    { 
        id: 'situation', 
        text: "Situation Pro", 
        desc: "Votre statut actuel ?", 
        icon: 'fa-user-tie', 
        type: 'select', 
        options: [
            {val: 'cdi', label: 'CDI'},
            {val: 'cdd', label: 'CDD / Intérim'},
            {val: 'etudiant', label: 'Étudiant'},
            {val: 'chomage', label: 'Recherche d\'emploi'}
        ] 
    },
    { id: 'foyer', text: "Votre foyer", desc: "Combien de personnes ?", icon: 'fa-users', type: 'input' },
    { id: 'revenus', text: "Salaires nets", desc: "Total des revenus avant aides.", icon: 'fa-briefcase', type: 'input' },
    { id: 'aides', text: "Aides actuelles", desc: "CAF, APL, bourses...", icon: 'fa-hand-holding-dollar', type: 'input' },
    { id: 'loyer', text: "Logement", desc: "Loyer ou mensualité crédit.", icon: 'fa-house', type: 'input' },
    { id: 'courses', text: "Courses", desc: "Alimentation et hygiène par mois.", icon: 'fa-cart-shopping', type: 'input' },
    { id: 'charges', text: "Autres charges", desc: "Énergie, transport, abonnements.", icon: 'fa-bolt', type: 'input' }
];

function startQuiz() {
    state.step = 0;
    state.data = { foyer: 1, situation: '', objectif: '', revenus: 0, aides: 0, loyer: 0, courses: 0, charges: 0 };
    showView('view-quiz');
    renderStep();
}

function renderStep() {
    const s = steps[state.step];
    if(!s) return calculateResults();

    document.getElementById('progress-bar').style.width = `${(state.step / steps.length) * 100}%`;
    document.getElementById('q-text').innerText = s.text;
    document.getElementById('q-desc').innerText = s.desc;
    document.getElementById('q-icon').innerHTML = `<i class="fa-solid ${s.icon}"></i>`;
    
    const inputWrap = document.getElementById('input-wrap');
    const dualBtns = document.getElementById('dual-btns');
    const btnNext = document.getElementById('btn-next');

    if (s.type === 'select') {
        inputWrap.classList.add('hidden');
        btnNext.classList.add('hidden');
        dualBtns.classList.remove('hidden');
        dualBtns.innerHTML = s.options.map(opt => 
            `<button onclick="handleSelection('${s.id}', '${opt.val}')" class="btn btn-outline" style="margin-bottom:10px">${opt.label}</button>`
        ).join('');
    } else {
        inputWrap.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        dualBtns.classList.add('hidden');
        document.getElementById('q-input').value = "";
    }
}

function handleSelection(key, value) {
    state.data[key] = value;
    state.step++;
    renderStep();
}

document.getElementById('btn-next').onclick = () => {
    const val = parseFloat(document.getElementById('q-input').value) || 0;
    const s = steps[state.step];
    state.data[s.id] = val;
    state.step++;
    renderStep();
};

// --- ANALYSE IA ET AIDES ---
function calculateResults() {
    showView('view-results');
    const totalIn = state.data.revenus + state.data.aides;
    const totalOut = state.data.loyer + state.data.courses + state.data.charges;
    const reste = Math.round(totalIn - totalOut);
    const epargne = Math.round(totalIn * 0.10);

    document.getElementById('res-total').innerText = `${reste}€`;
    document.getElementById('res-save').innerText = `${epargne}€`;
    document.getElementById('res-aides').innerText = `${state.data.aides}€`;

    // Moteur d'IA
    let advice = `<b>${state.data.objectif === 'difficulte' ? "⚠️ Diagnostic Prioritaire" : "💡 Conseil Stratégique"} :</b> `;
    
    if(reste < 0) advice += "Votre budget est en déséquilibre. Réduisez les charges non-essentielles immédiatement. ";
    else if(state.data.situation === 'cdi') advice += "Votre stabilité en CDI permet d'envisager une épargne automatique. ";
    else advice += "Prévoyez une épargne de sécurité plus large à cause de la variabilité de vos revenus. ";

    // Détection d'aides
    let helps = [];
    if(state.data.revenus < 1900 && state.data.revenus > 600) helps.push("<b>✨ Prime d'Activité :</b> Vous semblez éligible (voir caf.fr).");
    if(state.data.situation === 'etudiant') helps.push("<b>🎓 Aides CROUS :</b> Vérifiez vos droits aux bourses.");
    if(state.data.situation === 'chomage') helps.push("<b>📉 France Travail :</b> Vérifiez vos aides à la mobilité.");
    if(state.data.loyer > (state.data.revenus * 0.4)) helps.push("<b>🏠 APL :</b> Votre loyer est très lourd, demandez une réévaluation CAF.");

    document.getElementById('ai-advice').innerHTML = advice + "<br><br>" + 
        (helps.length > 0 ? "<b>Aides suggérées :</b><br>" + helps.join('<br>') : "Gestion saine détectée.");

    state.bilan = { res: reste, date: new Date().toLocaleDateString() };
}

// --- CLOUD ---
async function saveBilanCloud() {
    const { error } = await _supabase.from('bilans').upsert({
        user_id: state.user.id,
        reste_a_vivre: state.bilan.res,
        data_json: state.bilan
    });
    if(!error) { alert("Analyse enregistrée !"); showView('view-dashboard'); loadHistory(); }
}

async function loadHistory() {
    const { data } = await _supabase.from('bilans').select('*').eq('user_id', state.user.id).order('created_at', {ascending: false}).limit(1);
    if(data && data.length > 0) {
        document.getElementById('history-container').innerHTML = `
            <div class="card" style="margin-top:20px; border-left: 4px solid var(--accent);">
                <small>Dernier bilan (${data[0].created_at.split('T')[0]})</small>
                <h3>${data[0].reste_a_vivre}€ / mois</h3>
            </div>`;
    }
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
function handleLogout() { _supabase.auth.signOut(); location.reload(); }
function resetQuiz() { showView('view-dashboard'); }
window.onload = checkSession;
