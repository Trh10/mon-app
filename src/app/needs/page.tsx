"use client";

export default function NeedsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestion des Besoins</h1>
      <p className="text-gray-600">Module de gestion des besoins en cours de développement...</p>
    </div>
  );
}

// Composant FilterButton
function FilterButton({ 
  children, 
  active, 
  onClick, 
  count 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void; 
  count: number; 
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
      }`}
    >
      {children}
      <span className={`px-2 py-1 rounded-full text-xs ${
        active ? 'bg-blue-500' : 'bg-gray-200'
      }`}>
        {count}
      </span>
    </button>
  );
}

// Composant NeedCard
function NeedCard({ need, onUpdate }: { need: Need; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{need.title}</h3>
          <p className="text-gray-600 mb-3">{need.description}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Euro className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{need.budget.toLocaleString()} €</span>
            </div>
            
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-gray-400" />
              <span>{need.requesterName}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{new Date(need.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[need.status]}`}>
            {STATUS_LABELS[need.status]}
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[need.priority]}`}>
            {PRIORITY_LABELS[need.priority]}
          </div>
          
          <div className="text-xs text-gray-500">
            {CATEGORY_LABELS[need.category]}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t pt-4 mt-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Justification</h4>
            <p className="text-gray-600">{need.justification}</p>
          </div>
          
          {need.workflow.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Workflow d'approbation</h4>
              <div className="space-y-2">
                {need.workflow.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.isCompleted 
                        ? step.action === 'approved' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.isCompleted ? (
                        step.action === 'approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{step.reviewerName}</div>
                      {step.comment && (
                        <div className="text-gray-600 italic">"{step.comment}"</div>
                      )}
                    </div>
                    
                    <div className="text-gray-500">
                      {step.isCompleted ? new Date(step.createdAt).toLocaleDateString() : 'En attente'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        {expanded ? 'Masquer les détails' : 'Voir les détails'}
      </button>
    </div>
  );
}

// Composant CreateNeedModal
function CreateNeedModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void; 
  onSubmit: (data: CreateNeedData) => void; 
}) {
  const [formData, setFormData] = useState<CreateNeedData>({
    title: '',
    description: '',
    category: 'materiel',
    priority: 'moyenne',
    budget: 0,
    justification: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouveau Besoin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du besoin *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Nouvel ordinateur portable"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Décrivez en détail votre besoin..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorité *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget estimé (€) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justification *
            </label>
            <textarea
              required
              rows={3}
              value={formData.justification}
              onChange={(e) => setFormData({...formData, justification: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Expliquez pourquoi ce besoin est important..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer le besoin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NeedsPage() {
  const { user } = useCodeAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending' | 'approved' | 'rejected'>('all');

  // Charger les besoins
  useEffect(() => {
    if (user) {
      loadNeeds();
    }
  }, [user]);

  const loadNeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/needs');
      const data = await response.json();
      
      if (data.success) {
        setNeeds(data.needs);
      }
    } catch (error) {
      console.error('Erreur chargement besoins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les besoins selon le filtre sélectionné
  const filteredNeeds = needs.filter(need => {
    switch (filter) {
      case 'mine':
        return need.requesterId === user?.id;
      case 'pending':
        return ['soumis', 'en_review'].includes(need.status);
      case 'approved':
        return need.status === 'approuve';
      case 'rejected':
        return need.status === 'rejete';
      default:
        return true;
    }
  });

  // Créer un nouveau besoin
  const handleCreateNeed = async (needData: CreateNeedData) => {
    try {
      const response = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needData)
      });

      const data = await response.json();
      
      if (data.success) {
        setNeeds([data.need, ...needs]);
        setShowCreateForm(false);
      } else {
        alert('Erreur: ' + data.message);
      }
    } catch (error) {
      console.error('Erreur création besoin:', error);
      alert('Erreur lors de la création');
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">États de Besoin</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="w-4 h-4" />
                {user.companyCode}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {user.name}
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nouveau Besoin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <FilterButton 
              active={filter === 'all'} 
              onClick={() => setFilter('all')}
              count={needs.length}
            >
              Tous
            </FilterButton>
            <FilterButton 
              active={filter === 'mine'} 
              onClick={() => setFilter('mine')}
              count={needs.filter(n => n.requesterId === user.id).length}
            >
              Mes Besoins
            </FilterButton>
            <FilterButton 
              active={filter === 'pending'} 
              onClick={() => setFilter('pending')}
              count={needs.filter(n => ['soumis', 'en_review'].includes(n.status)).length}
            >
              En Attente
            </FilterButton>
            <FilterButton 
              active={filter === 'approved'} 
              onClick={() => setFilter('approved')}
              count={needs.filter(n => n.status === 'approuve').length}
            >
              Approuvés
            </FilterButton>
            <FilterButton 
              active={filter === 'rejected'} 
              onClick={() => setFilter('rejected')}
              count={needs.filter(n => n.status === 'rejete').length}
            >
              Rejetés
            </FilterButton>
          </div>
        </div>

        {/* Liste des besoins */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredNeeds.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun besoin trouvé</h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'Aucun besoin créé' : `Aucun besoin dans la catégorie "${filter}"`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Créer le premier besoin
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredNeeds.map(need => (
              <NeedCard key={need.id} need={need} onUpdate={loadNeeds} />
            ))}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showCreateForm && (
        <CreateNeedModal 
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateNeed}
        />
      )}
    </div>
  );
}

export default NeedsPage;
