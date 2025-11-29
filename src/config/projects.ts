export interface Project {
  id: string;
  name: string;
  brandId: string;
  metadata: {
    location: string;
    pricing: string;
    usps: string[];
    competition: string[];
    targetAudience: string;
  };
}

export interface Brand {
  id: string;
  name: string;
  projects: Project[];
}

export const BRANDS: Brand[] = [
  {
    id: 'kalpataru',
    name: 'Kalpataru',
    projects: [
      {
        id: 'kalpataru-vista',
        name: 'Kalpataru Vista',
        brandId: 'kalpataru',
        metadata: {
          location: 'Bandra East, Mumbai',
          pricing: '₹4.5-7.2 Cr for 2-3 BHK',
          usps: [
            'Premium sea-facing apartments',
            'World-class amenities',
            'Close to BKC business district',
            'RERA approved'
          ],
          competition: ['Lodha Belmondo', 'Oberoi Sky City'],
          targetAudience: 'High-net-worth individuals and corporate executives'
        }
      },
      {
        id: 'kalpataru-paramount',
        name: 'Kalpataru Paramount',
        brandId: 'kalpataru',
        metadata: {
          location: 'Thane West',
          pricing: '₹1.8-3.2 Cr for 2-3 BHK',
          usps: [
            'Spacious homes with modern design',
            'Excellent connectivity to Mumbai',
            'Green surroundings',
            'Premium amenities'
          ],
          competition: ['Lodha Amara', 'Hiranandani Fortune City'],
          targetAudience: 'Upper-middle-class families'
        }
      }
    ]
  },
  {
    id: 'lodha',
    name: 'Lodha',
    projects: [
      {
        id: 'lodha-world-towers',
        name: 'Lodha World Towers',
        brandId: 'lodha',
        metadata: {
          location: 'Lower Parel, Mumbai',
          pricing: '₹8-15 Cr for 3-4 BHK',
          usps: [
            'Ultra-luxury residences',
            'Private club and spa',
            'Iconic landmark tower',
            'Central Mumbai location'
          ],
          competition: ['Four Seasons Private Residences', 'Trump Tower'],
          targetAudience: 'Ultra-high-net-worth individuals'
        }
      },
      {
        id: 'lodha-belmondo',
        name: 'Lodha Belmondo',
        brandId: 'lodha',
        metadata: {
          location: 'Gamdevi, Mumbai',
          pricing: '₹6-10 Cr for 2-3 BHK',
          usps: [
            'Italian-inspired architecture',
            'Sea-facing apartments',
            'Premium location',
            'Luxury amenities'
          ],
          competition: ['Kalpataru Vista', 'Oberoi Sky City'],
          targetAudience: 'Affluent professionals and business owners'
        }
      }
    ]
  },
  {
    id: 'oberoi',
    name: 'Oberoi Realty',
    projects: [
      {
        id: 'oberoi-sky-city',
        name: 'Oberoi Sky City',
        brandId: 'oberoi',
        metadata: {
          location: 'Borivali East, Mumbai',
          pricing: '₹2.5-5 Cr for 2-3 BHK',
          usps: [
            'Sprawling township',
            'World-class amenities',
            'Excellent connectivity',
            'Green spaces'
          ],
          competition: ['Kalpataru Riverside', 'Lodha Upper Thane'],
          targetAudience: 'Middle to upper-middle-class families'
        }
      }
    ]
  }
];

export const getBrandById = (brandId: string): Brand | undefined => {
  return BRANDS.find(b => b.id === brandId);
};

export const getProjectById = (projectId: string): Project | undefined => {
  for (const brand of BRANDS) {
    const project = brand.projects.find(p => p.id === projectId);
    if (project) return project;
  }
  return undefined;
};
