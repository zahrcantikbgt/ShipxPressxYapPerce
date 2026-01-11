import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Tag, Percent, Gift } from 'lucide-react';

const banners = [
  {
    id: 1,
    title: 'Special Discount!',
    subtitle: 'Get 20% OFF on International Shipments',
    description: 'Limited time offer for all corporate customers',
    color: 'from-orange to-[#E8A01F]',
    icon: Percent,
    action: 'Learn More',
    offer: {
      title: 'Special Discount - 20% OFF',
      details: [
        'Get 20% discount on all international shipments',
        'Valid for corporate customers only',
        'Minimum order value: $500',
        'Promo code: SHIP20',
        'Valid until: December 31, 2024',
      ],
      benefits: [
        'Free insurance coverage',
        'Priority handling',
        '24/7 customer support',
      ],
    },
  },
  {
    id: 2,
    title: 'New Partner Added',
    subtitle: 'Express Delivery Available',
    description: 'Same-day delivery for selected routes',
    color: 'from-blue-500 to-cyan-500',
    icon: Tag,
    action: 'View Details',
    offer: {
      title: 'Express Delivery Service',
      details: [
        'Same-day delivery available',
        'Selected routes: Jakarta, Bandung, Surabaya, Yogyakarta',
        'Order before 12:00 PM for same-day delivery',
        'Additional fee: $25',
        'Real-time tracking included',
      ],
      benefits: [
        'Guaranteed delivery time',
        'Priority handling',
        'SMS notifications',
      ],
    },
  },
  {
    id: 3,
    title: 'Loyalty Rewards',
    subtitle: 'Earn Points with Every Shipment',
    description: 'Join our loyalty program and get exclusive benefits',
    color: 'from-purple-500 to-pink-500',
    icon: Gift,
    action: 'Join Now',
    offer: {
      title: 'Loyalty Rewards Program',
      details: [
        'Earn 1 point for every $1 spent',
        'Redeem points for discounts and free shipping',
        'Tier levels: Bronze, Silver, Gold, Platinum',
        'Exclusive member-only promotions',
        'Birthday rewards and special offers',
      ],
      benefits: [
        'Free shipping on orders over 1000 points',
        'Early access to new services',
        'Dedicated account manager (Gold & Platinum)',
      ],
    },
  },
];

const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextBanner = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToBanner = (index) => {
    setCurrentIndex(index);
  };

  if (!isVisible) return null;

  const currentBanner = banners[currentIndex];
  const Icon = currentBanner.icon;

  return (
    <div 
      className="relative bg-gradient-to-r from-orange via-[#FAB12F] to-[#E8A01F] rounded-2xl shadow-xl overflow-hidden mb-6 cursor-pointer"
      onClick={() => setShowModal(true)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
        }}
        className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative p-8 md:p-12">
        {/* Navigation Arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevBanner();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            nextBanner();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Banner Content */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-white">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold">
                {currentBanner.title}
              </span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold mb-2">{currentBanner.subtitle}</h3>
            <p className="text-white/90 text-lg mb-4">{currentBanner.description}</p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="bg-white text-orange px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
            >
              {currentBanner.action}
            </button>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl">
              <Icon className="w-24 h-24 text-white/30" />
            </div>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center space-x-2 mt-6">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToBanner(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/40 w-2 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Offer Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-r ${currentBanner.color} p-6 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{currentBanner.offer.title}</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Offer Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Offer Details</h3>
                <ul className="space-y-2">
                  {currentBanner.offer.details.map((detail, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-orange mt-1">•</span>
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits */}
              <div className="bg-gradient-to-br from-orange/10 to-[#E8A01F]/10 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Benefits</h3>
                <ul className="space-y-2">
                  {currentBanner.offer.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    // Add your action here (e.g., navigate to registration, apply promo code, etc.)
                  }}
                  className={`flex-1 bg-gradient-to-r ${currentBanner.color} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}
                >
                  {currentBanner.action}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;

