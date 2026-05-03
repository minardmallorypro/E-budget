const SUPABASE_URL = 'https://dsambzdkakpztmsfwxee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a37NCM5-9B2J8tcNYDn9kw_eaqC5o0A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    user: null,
    isLogin: true,
    step: 0,
    data: { foyer: 1, ages: [], situation: '', revenus: 0, aides: 0, loyer: 0, courses: 0, edf: 0, abonnements: 0, assurances: 0 }
};

// FLUX DYNAMIQUE
const steps = [
    { id: 'situation', text: "Votre Situation", type: 'select', icon: 'fa-briefcase', options: [{val:'cdi', label:'CDI'}, {val:'cdd', label:'CDD/Intérim'}, {val:'etudiant', label:'Étudiant'}, {val:'chomage', label:'Recherche d\'emploi'}] },
    { id: 'foyer', text: "Nombre d'occupants", desc: "Combien de personnes au foyer ?", type: 'input', icon: 'fa-users' },
    { id: 'ages', text: "Âges des occupants", desc: "Âge de la personne ", type: 'input', icon: 'fa-calendar-day' }, // Sera géré dynamiquement
    { id: 'revenus', text: "Revenus mensuels", desc: "Salaires nets cumulés", type: 'input', icon: 'fa-wallet' },
    { id: 'aides', text: "Aides actuelles", desc: "CAF, APL, bourses...", type: 'input', icon: 'fa-hand-holding-dollar' },
    { id: 'loyer', text: "Logement", desc: "Loyer ou crédit", type: 'input', icon: 'fa-house' },
    { id: 'courses', text: "Budget Courses", desc: "Alimentation et hygiène", type: 'input', icon: 'fa-cart-shopping' },
    { id: 'edf', text: "Énergie", desc: "Électricité, Gaz, Eau", type: 'input', icon: 'fa-bolt' },
    { id: 'abonnements', text: "Abonnements", desc: "Internet, Mobile, Stream...", type: 'input', icon: 'fa-mobile-screen' },
    { id: 'assurances', text: "Assurances", desc: "Habitation, Santé, Auto", type: 'input', icon: 'fa-shield-halved' }
];

let currentAgeIndex = 0;

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// CORRECTION : Retour au départ
function goToLanding() {
    state.step = 0;
    currentAgeIndex = 0;
    state.data.ages = [];
    showView('view-landing');
}

function startQuiz() {
    state.step = 0;
    currentAgeIndex = 0;
    state.data.ages = [];
    showView('view-quiz');
    renderStep();
}

function renderStep() {
    const s = steps[state.step];
    if(!s) return calculateResults();

    const inputWrap = document.getElementById('input-wrap');
    const euroWrap = document.getElementById('euro-wrap');
    const dualBtns = document.getElementById('dual-btns');
    const btnNext = document.getElementById('btn-next');
    const qInput = document.getElementById('q-input');

    // Cas spécial : Saisie des âges multiple
    if (s.id === 'ages') {
        document.getElementById('q-text').innerText = `Âge de la personne ${currentAgeIndex + 1}`;
        document.getElementById('q-desc').innerText = `Sur ${state.data.foyer} personne(s) au total`;
    } else {
        document.getElementById('q-text').innerText = s.text;
        document.getElementById('q-desc').innerText = s.desc || "";
    }

    document.getElementById('q-icon').innerHTML = `<i class="fa-solid ${s.icon}"></i>`;
    
    if (s.type === 'select') {
        inputWrap.classList.add('hidden');
        btnNext.classList.add('hidden');
        dualBtns.classList.remove('hidden');
        dualBtns.innerHTML = s.options.map(opt => `<button onclick="handleSelection('${s.id}', '${opt.val}')" class="choice-btn">${opt.label}</button>`).join('');
    } else {
        inputWrap.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        dualBtns.classList.add('hidden');
        qInput.value = "";
        (s.id === 'foyer' || s.id === 'ages') ? euroWrap.classList.remove('input-wrapper-euro') : euroWrap.classList.add('input-wrapper-euro');
        qInput.focus();
    }
    document.getElementById('progress-bar').style.width = `${((state.step + 1) / steps.length) * 100}%`;
}

function handleSelection(key, value) {
    state.data[key] = value;
    state.step++;
    renderStep();
}

document.getElementById('btn-next').onclick = () => {
    const val = document.getElementById('q-input').value;
    const currentStepId = steps[state.step].id;

    if (currentStepId === 'foyer') {
        state.data.foyer = parseInt(val) || 1;
        state.step++;
    } 
    else if (currentStepId === 'ages') {
        state.data.ages.push(parseInt(val) || 0);
        currentAgeIndex++;
        // Si on n'a pas encore saisi l'âge de tout le monde, on reste sur cette étape
        if (currentAgeIndex < state.data.foyer) {
            renderStep();
            return;
        } else {
            state.step++;
        }
    } 
    else {
        state.data[currentStepId] = parseFloat(val || 0);
        state.step++;
    }
    renderStep();
};

function calculateResults() {
    const totalIn = state.data.revenus + state.data.aides;
    const totalOut = state.data.loyer + state.data.courses + state.data.edf + state.data.abonnements + state.data.assurances;
    const reste = Math.round(totalIn - totalOut);
    
    document.getElementById('res-total').innerText = `${reste}€`;
    document.getElementById('res-save').innerText = `${Math.max(0, Math.round(reste * 0.15))}€`;

    let advice = `<b>Analyse IA & Opportunités :</b><br>`;
    
    // IA - Analyse des âges pour les aides
    const hasMinor = state.data.ages.some(a => a < 18);
    const hasStudent = state.data.ages.some(a => a >= 18 && a <= 25);
    
    if (hasMinor) advice += "• <b>Famille :</b> Enfants détectés. Vérifiez vos droits à l'ARS (Allocation Rentrée Scolaire).<br>";
    if (hasStudent) advice += "• <b>Études :</b> Profil 18-25 ans. Pensez aux bourses CROUS ou à l'aide au premier logement.<br>";
    if (state.data.edf > 150) advice += "• <b>Énergie :</b> Vos factures sont hautes. Testez votre éligibilité au 'Chèque Énergie'.<br>";

    advice += `<br><b>Investissement (Vision 5 ans) :</b><br>`;
    if (reste > 100) {
        const capaInvest = Math.round(reste * 0.2);
        const projection = Math.round(capaInvest * 12 * 5 * 1.05); // Simulation 5% intérêt/an
        advice += `📈 En plaçant <b>${capaInvest}€/mois</b> à 5%, vous pourriez avoir environ <b>${projection}€</b> dans 5 ans.`;
    } else {
        advice += "⚠️ Capacité d'investissement trop faible. Concentrez-vous sur l'épargne de précaution.";
    }

    document.getElementById('ai-advice').innerHTML = advice;
    showView('view-results');
}

async function saveBilanCloud() {
    if(!state.user) return alert("Veuillez vous connecter.");
    const payload = {
        user_id: state.user.id,
        reste_a_vivre: parseFloat(document.getElementById('res-total').innerText),
        data_json: state.data
    };
    const { error } = await _supabase.from('bilans').insert([payload]);
    if(error) alert("Erreur : " + error.message);
    else { alert("Analyse sauvegardée !"); showView('view-dashboard'); }
}

// AUTH
async function processAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = state.isLogin ? await _supabase.auth.signInWithPassword({ email, password }) : await _supabase.auth.signUp({ email, password });
    if(error) alert(error.message); else checkSession();
}

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        state.user = session.user;
        document.getElementById('display-email').innerText = state.user.email;
        document.getElementById('auth-status').classList.remove('hidden');
        showView('view-dashboard');
    }
}

function handleLogout() { _supabase.auth.signOut(); location.reload(); }
function toggleAuthMode() {
    state.isLogin = !state.isLogin;
    document.getElementById('auth-title').innerText = state.isLogin ? "Connexion" : "Inscription";
    document.getElementById('auth-toggle').innerText = state.isLogin ? "Créer un profil" : "Se connecter";
}

window.onload = checkSession;
