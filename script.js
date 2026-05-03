const SUPABASE_URL = 'https://dsambzdkakpztmsfwxee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a37NCM5-9B2J8tcNYDn9kw_eaqC5o0A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = { user: null, step: 0, steps: [], data: {} };

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        state.user = session.user;
        document.getElementById('display-email').innerText = state.user.email;
        document.getElementById('auth-status').classList.remove('hidden');
    }
}

function startQuiz() {
    state.data = {};
    state.step = 0;
    // Reconstruction de la liste complète des questions
    state.steps = [
        { id: 'foyer', text: "Composition du foyer", desc: "Combien de personnes sous votre toit ?", icon: 'fa-users', type: 'input', unit: 'pers' },
        { id: 'situation', text: "Votre Situation", desc: "Statut professionnel actuel.", icon: 'fa-briefcase', type: 'select', 
          options: [{val:'cdi', label:'CDI'}, {val:'cdd', label:'CDD/Intérim'}, {val:'etudiant', label:'Étudiant'}, {val:'chomage', label:'Recherche d\'emploi'}]},
        { id: 'revenus', text: "Revenus fixes", desc: "Salaire net mensuel cumulé.", icon: 'fa-wallet', type: 'input', unit: '€' },
        { id: 'aides', text: "Aides reçues", desc: "CAF, APL, bourses.", icon: 'fa-hand-holding-dollar', type: 'input', unit: '€' },
        { id: 'loyer', text: "Loyer / Crédit", desc: "Frais de logement.", icon: 'fa-house', type: 'input', unit: '€' },
        { id: 'courses', text: "Alimentation", desc: "Budget courses mensuel.", icon: 'fa-cart-shopping', type: 'input', unit: '€' },
        { id: 'energie', text: "Énergie & Eau", desc: "Électricité, Gaz, Eau.", icon: 'fa-bolt', type: 'input', unit: '€' },
        { id: 'abonnements', text: "Abonnements", desc: "Téléphone, Netflix, Sport.", icon: 'fa-tv', type: 'input', unit: '€' },
        { id: 'credits', text: "Assurances & Crédits", desc: "Auto, Santé, Prêts.", icon: 'fa-shield', type: 'input', unit: '€' }
    ];
    showView('view-quiz');
    renderStep();
}

function renderStep() {
    const s = state.steps[state.step];
    if(!s) return calculateResults();

    document.getElementById('q-icon').innerHTML = `<i class="fa-solid ${s.icon}"></i>`;
    document.getElementById('q-text').innerText = s.text;
    document.getElementById('q-desc').innerText = s.desc;
    
    const inputWrap = document.getElementById('input-wrap');
    const dualBtns = document.getElementById('dual-btns');
    const btnNext = document.getElementById('btn-next');

    if (s.type === 'select') {
        inputWrap.classList.add('hidden'); btnNext.classList.add('hidden');
        dualBtns.classList.remove('hidden');
        dualBtns.innerHTML = s.options.map(opt => `<button onclick="handleSelection('${s.id}', '${opt.val}')" class="select-btn">${opt.label}</button>`).join('');
    } else {
        inputWrap.classList.remove('hidden'); btnNext.classList.remove('hidden');
        dualBtns.classList.add('hidden');
        document.getElementById('q-unit').innerText = s.unit;
        const inp = document.getElementById('q-input');
        inp.value = ""; inp.focus();
    }
}

function handleSelection(key, value) {
    state.data[key] = value;
    state.step++;
    renderStep();
}

document.getElementById('btn-next').onclick = () => {
    const val = parseInt(document.getElementById('q-input').value) || 0;
    const currentStep = state.steps[state.step];
    state.data[currentStep.id] = val;

    // LOGIQUE MULTI-PERSONNES : On ajoute les questions d'âge dynamiquement
    if(currentStep.id === 'foyer') {
        for(let i = val; i >= 1; i--) {
            state.steps.splice(state.step + 1, 0, {
                id: `age_p${i}`, text: `Âge personne ${i}`, desc: `Âge pour le calcul des aides.`, icon: 'fa-cake-candles', type: 'input', unit: 'ans'
            });
        }
    }
    state.step++;
    renderStep();
};

function calculateResults() {
    showView('view-results');
    const totalIn = (state.data.revenus || 0) + (state.data.aides || 0);
    const totalOut = (state.data.loyer || 0) + (state.data.courses || 0) + (state.data.energie || 0) + (state.data.abonnements || 0) + (state.data.credits || 0);
    const reste = totalIn - totalOut;
    
    document.getElementById('res-total').innerText = `${reste}€`;
    document.getElementById('res-daily').innerText = `Reste : ${Math.round(reste/30)}€ / jour`;
    
    // IA DE CONSEIL ET INVESTISSEMENT
    let iaHtml = "<h3><i class='fa-solid fa-microchip'></i> Analyse IA</h3>";
    
    // Test APL Jeune (sur n'importe quelle personne du foyer)
    let hasYoung = false;
    for(let k in state.data) { if(k.startsWith('age_p') && state.data[k] < 26) hasYoung = true; }
    
    if(hasYoung && state.data.revenus < 2000) iaHtml += "<div class='tag-aid'>💡 <b>APL Jeune :</b> Profil éligible détecté, vérifiez vos droits sur la CAF.</div>";
    if(state.data.situation === 'etudiant') iaHtml += "<div class='tag-aid'>🎓 <b>Bourses :</b> Pensez à simuler vos droits au CROUS (échelon 0 bis à 7).</div>";
    
    if(reste > 150) {
        iaHtml += "<p style='margin-top:10px;'>📈 <b>Investissement :</b> Avec " + reste + "€ de reste, placez <b>" + Math.round(reste*0.4) + "€/mois</b> sur un PEA ou une Assurance Vie.</p>";
    } else {
        iaHtml += "<p style='color:#ef4444;'>⚠️ <b>Alerte :</b> Votre marge est faible. Réduisez les 'Abonnements' pour regagner de l'oxygène.</p>";
    }

    document.getElementById('ai-advice').innerHTML = iaHtml;
}

async function saveAnalysis() {
    if(!state.user) return alert("Veuillez vous connecter.");
    const btn = document.getElementById('btn-save');
    btn.innerText = "Enregistrement...";
    
    const { error } = await _supabase.from('analyses').insert([{
        user_id: state.user.id,
        data: state.data,
        resultat: document.getElementById('res-total').innerText.replace('€','')
    }]);

    if(!error) {
        btn.innerText = "Déclaration Enregistrée !";
        btn.style.background = "#10b981";
    } else {
        alert("Erreur de sauvegarde : " + error.message);
        btn.innerText = "Réessayer";
    }
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function handleLogout() { _supabase.auth.signOut().then(() => location.reload()); }
window.onload = checkSession;
