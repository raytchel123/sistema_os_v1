import { X, Calendar, Clock, Tag, FileText, Wand2, Save, Play } from 'lucide-react';

interface PostSuggestionModal {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  post_type: 'POST' | 'STORY' | 'REELS';
  title: string;
  description: string;
  hook: string;
  development: string;
  cta: string;
  copy_final: string;
  hashtags: string[];
  visual_elements: string[];
  soundtrack?: string;
  thumbnail_url: string;
  status: string;
  brand_code: string;
}

interface PostDetailsModalProps {
  post: PostSuggestionModal;
  onClose: () => void;
  onCreateOS: (post: PostSuggestionModal) => void;
}

export function PostDetailsModal({ post, onClose, onCreateOS }: PostDetailsModalProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'POST': 'bg-blue-500 text-white',
      'STORY': 'bg-purple-500 text-white',
      'REELS': 'bg-pink-500 text-white'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getBrandColor = (brand: string) => {
    const colors = {
      'RAYTCHEL': 'bg-pink-100 text-pink-800',
      'ZAFFIRA': 'bg-purple-100 text-purple-800',
      'ZAFF': 'bg-blue-100 text-blue-800',
      'CRISPIM': 'bg-green-100 text-green-800',
      'FAZENDA': 'bg-orange-100 text-orange-800'
    };
    return colors[brand as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{post.title}</h2>
                <p className="text-purple-100">{formatDate(post.scheduled_date)} às {post.scheduled_time}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Visual Preview */}
            <div className="space-y-6">
              {/* Post Preview */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Play className="w-5 h-5 mr-2 text-purple-600" />
                  Preview do Post
                </h3>
                
                <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  <img 
                    src={post.thumbnail_url} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<span class="text-4xl">🎬</span>';
                    }}
                  />
                </div>

                {/* Post Metadata */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(post.post_type)}`}>
                      {post.post_type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBrandColor(post.brand_code)}`}>
                      {post.brand_code}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{formatDate(post.scheduled_date)} às {post.scheduled_time}</span>
                  </div>
                </div>
              </div>

              {/* Visual Elements */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Elementos Visuais</h4>
                <div className="space-y-2">
                  {post.visual_elements.map((element, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      {element}
                    </div>
                  ))}
                </div>
                
                {post.soundtrack && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center text-sm text-purple-800">
                      <span className="mr-2">🎵</span>
                      <span className="font-medium">Trilha Sonora:</span>
                      <span className="ml-2">{post.soundtrack}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Content Details */}
            <div className="space-y-6">
              {/* Hook */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gancho
                </h4>
                <p className="text-orange-700 font-medium italic">
                  "{post.hook}"
                </p>
              </div>

              {/* Development */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Desenvolvimento
                </h4>
                <p className="text-blue-700 text-sm leading-relaxed">
                  {post.development}
                </p>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Call to Action</h4>
                <p className="text-green-700 font-medium">
                  "{post.cta}"
                </p>
              </div>

              {/* Copy Final */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Copy Final</h4>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {post.copy_final}
                  </pre>
                </div>
              </div>

              {/* Hashtags */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Hashtags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {post.hashtags.map((hashtag, index) => (
                    <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => onCreateOS(post)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Criar OS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}