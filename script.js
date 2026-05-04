const SUPABASE_URL = 'https://dsambzdkakpztmsfwxee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a37NCM5-9B2J8tcNYDn9kw_eaqC5o0A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = { user: null, step: 0, steps: [], data: {}, isSignup: false };

// --- AUTHENTIFICATION ---
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('btn-auth');
    const errBox = document.getElementById('auth-error');

    if (!email || !password) { errBox.innerText = "Champs requis."; errBox.style.display = 'block'; return; }
    errBox.style.display = 'none';
    btn.innerText = "Chargement...";
    btn.disabled = true;

    try {
        const { data, error } = state.isSignup 
            ? await _supabase.auth.signUp({ email, password })
            : await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (state.isSignup) alert("Compte créé ! Vérifiez vos emails.");
        else await checkSession();
    } catch (err) {
        errBox.innerText = "Erreur: " + err.message;
        errBox.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerText = state.isSignup ? "Créer mon compte" : "Accéder à mon espace";
    }
}

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        state.user = session.user;
        document.getElementById('display-email').innerText = state.user.email;
        document.getElementById('user-header').classList.remove('hidden');
        showDashboard();
    } else { showView('view-auth'); }
}

// --- DASHBOARD ---
async function showDashboard() {
    showView('view-dashboard');
    const container = document.getElementById('history-container');
    try {
        const { data, error } = await _supabase.from('analyses').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false });
        if (error) throw error;
        container.innerHTML = data.length > 0 ? data.map(item => `
            <div class="history-card">
                <div><strong>${item.resultat}€ Net restant</strong><br><small>${new Date(item.created_at).toLocaleDateString()}</small></div>
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        `).join('') : "<p>Aucune analyse enregistrée.</p>";
    } catch (err) { container.innerHTML = "<p class='error-msg' style='display:block'>Erreur de table. Créez la table 'analyses' sur Supabase.</p>"; }
}

// --- MOTEUR IA COMPLET ---
function startQuiz() {
    state.data = {}; state.step = 0;
    state.steps = [
        // Section : Profil & Revenus
        { id: 'foyer', text: "Composition du foyer", desc: "Combien de personnes ?", type: 'input', unit: 'pers', icon: 'fa-users' },
        { id: 'revenus', text: "Revenus fixes", desc: "Salaire total net mensuel.", type: 'input', unit: '€', icon: 'fa-wallet' },
        { id: 'apl', text: "Aides (APL, CAF)", desc: "Montant total des aides reçues.", type: 'input', unit: '€', icon: 'fa-hand-holding-dollar' },
        { id: 'dep', text: "Localisation", desc: "N° de département (ex: 75, 13, 59...)", type: 'input', unit: 'N°', icon: 'fa-map-location-dot' },
        
        // Section : Logement & Charges Fixes
        { id: 'loyer', text: "Loyer / Crédit Immo", desc: "Coût de votre logement principal.", type: 'input', unit: '€', icon: 'fa-house' },
        { id: 'elec', text: "Énergie (Elec/Gaz)", desc: "Montant moyen mensuel.", type: 'input', unit: '€', icon: 'fa-bolt' },
        { id: 'tech', text: "Internet & Mobile", desc: "Cumul de vos abonnements tech.", type: 'input', unit: '€', icon: 'fa-wifi' },
        { id: 'credits', text: "Autres Crédits", desc: "Conso, Auto, etc. (Si aucun, mettre 0).", type: 'input', unit: '€', icon: 'fa-credit-card' }
    ];
    showView('view-quiz');
    renderStep();
}

function renderStep() {
    const s = state.steps[state.step];
    if (!s) return calculateFinalIA();

    document.getElementById('progress-fill').style.width = ((state.step / state.steps.length) * 100) + "%";
    document.getElementById('q-text').innerText = s.text;
    document.getElementById('q-desc').innerText = s.desc;
    document.getElementById('q-icon').innerHTML = `<i class="fa-solid ${s.icon || 'fa-question'}"></i>`;

    const inputWrap = document.getElementById('input-wrap');
    const stack = document.getElementById('button-stack');
    const btnNext = document.getElementById('btn-next');

    if (s.type === 'select') {
        inputWrap.classList.add('hidden'); btnNext.classList.add('hidden'); stack.classList.remove('hidden');
        stack.innerHTML = s.options.map(o => `<button class="select-btn" onclick="saveStep('${s.id}', '${o.v}')">${o.l}</button>`).join('');
    } else {
        stack.classList.add('hidden'); inputWrap.classList.remove('hidden'); btnNext.classList.remove('hidden');
        document.getElementById('q-unit').innerText = s.unit;
        document.getElementById('q-input').value = "";
    }
}

function saveStep(id, val) {
    state.data[id] = val;
    // Ajout dynamique des âges si foyer > 0
    if(id === 'foyer' && val > 0) {
        for(let i=1; i<=val; i++) {
            state.steps.splice(state.step + i, 0, { id: `age_${i}`, text: `Âge habitant ${i}`, desc: "Pour affiner le budget alimentaire.", type: 'input', unit: 'ans', icon: 'fa-cake-candles' });
        }
    }
    state.step++;
    renderStep();
}

function nextStep() {
    const val = parseInt(document.getElementById('q-input').value) || 0;
    saveStep(state.steps[state.step].id, val);
}

// --- ANALYSE IA BUDGET (ULTRA PRÉCISE) ---
function calculateFinalIA() {
    showView('view-results');
    const d = state.data;
    
    // Calcul financier strict
    const totalEntrees = parseInt(d.revenus) + parseInt(d.apl);
    const totalChargesFixes = parseInt(d.loyer) + parseInt(d.elec) + parseInt(d.tech) + parseInt(d.credits);
    const resteVrai = totalEntrees - totalChargesFixes;
    
    document.getElementById('res-total').innerText = `${resteVrai}€`;

    // Calcul budget courses (selon âge + département)
    let budgetCourses = 0;
    Object.keys(d).forEach(k => {
        if(k.startsWith('age_')) {
            const age = d[k];
            if(age < 12) budgetCourses += 140;
            else if(age < 18) budgetCourses += 200;
            else budgetCourses += 250;
        }
    });
    
    const depCher = [75, 92, 94, 13, 06, 69];
    if(depCher.includes(parseInt(d.dep))) budgetCourses *= 1.18;

    let advice = `<h3><i class="fa-solid fa-robot"></i> Stratégie IA</h3>`;
    advice += `<div class="tag-aid">🛒 <b>Courses :</b> Budget recommandé : <b>${Math.round(budgetCourses)}€</b>.</div>`;
    
    // Le reste à vivre après nourriture
    const disponibleApresNourriture = resteVrai - budgetCourses;

    if(disponibleApresNourriture > 150) {
        const invest = Math.round(disponibleApresNourriture * 0.35);
        const plaisir = Math.round(disponibleApresNourriture * 0.40);
        const epargne = Math.round(disponibleApresNourriture * 0.25);

        advice += `<div class="tag-aid" style="border-color:#f1c40f">🎉 <b>Budget Plaisir :</b> Profitez de <b>${plaisir}€</b> ce mois-ci !</div>`;
        advice += `<div class="tag-aid" style="border-color:var(--success)">📈 <b>Investissement :</b> Placez <b>${invest}€</b> (PEA/ETF).</div>`;
        advice += `<div class="tag-aid">🛡️ <b>Sécurité :</b> Gardez <b>${epargne}€</b> en épargne de précaution.</div>`;
    } else {
        advice += `<div class="tag-aid" style="border-color:var(--error)">⚠️ <b>Alerte IA :</b> Après nourriture, il vous reste <b>${disponibleApresNourriture}€</b>. Évitez les dépenses plaisirs non essentielles ce mois-ci.</div>`;
    }

    document.getElementById('ai-advice').innerHTML = advice;
}

async function saveAnalysis() {
    const btn = document.getElementById('btn-save');
    btn.innerText = "Sauvegarde...";
    const { error } = await _supabase.from('analyses').insert([{
        user_id: state.user.id,
        data: state.data,
        resultat: parseInt(document.getElementById('res-total').innerText)
    }]);
    if(!error) { alert("Analyse sauvegardée !"); showDashboard(); }
    else { alert("Erreur."); btn.innerText = "Enregistrer l'analyse"; }
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleAuthMode() {
    state.isSignup = !state.isSignup;
    document.getElementById('auth-title').innerText = state.isSignup ? "Créer un compte" : "Connexion";
}

function handleLogout() { _supabase.auth.signOut().then(() => location.reload()); }
function prevStep() { if(state.step > 0) { state.step--; renderStep(); } else { showDashboard(); } }

window.onload = checkSession;
