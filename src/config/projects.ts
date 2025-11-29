export interface ExcelSchema {
  requiredColumns: string[];
  optionalColumns: string[];
  columnMappings: Record<string, string>; // Excel column name -> Lead field name
}

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
  excelSchema: ExcelSchema;
}

// Kalpataru Brand Excel Schema - All 62 columns
const KALPATARU_SCHEMA: ExcelSchema = {
  requiredColumns: [
    'Opportunity Name',
    'Mobile',
    'Walkin Date',
    'Name of Closing Manager'
  ],
  optionalColumns: [
    'Duplicate check',
    'Segment',
    'Project',
    'Occupation',
    'Designation',
    'Profession',
    'Other Profession',
    'Department / Function',
    'Other Department / Function',
    'Industry / Sector',
    'Other Industry / Sector',
    'Nature of Business',
    'Place of Work (Company Name)',
    'Office PIN Code',
    'Location of Work',
    'Location of Residence',
    'Building Name',
    'Correspondence Street 1',
    'Correspondence Country',
    'Correspondence State',
    'Correspondence City',
    'Other City',
    'Correspondence Pin Code',
    'Nearest Railway/Metro Station',
    'Desired Floor Band',
    'Desired Facing',
    'Desired Carpet Area (Post-Walkin)',
    'Stage of Construction (Post-Walkin)',
    'Searching Property since (in months)',
    'Expected Date of Closure',
    'Source of Funding',
    'Competitor Name 1',
    'Competition Project Name 1',
    'Competition Visit Status 1',
    'Competitor Name 2',
    'Competition Project Name 2',
    'Competition Visit Status 2',
    'Interested Unit 1',
    'Interested Unit 2',
    'Owned/Stay in Kalpataru Property',
    'Existing Flat Details',
    'Cooling Date',
    'Converted',
    'Opportunity Converted by Revisit',
    'Opportunity ID',
    'Latest Revisit Date',
    'No. of Site Re-Visits',
    'Interested Tower 1',
    'Interested Floor 1',
    'Interested Unit 1',
    'Interested Unit 2',
    'Walkin Auto Rating',
    'Walkin Manual Rating',
    'Reason for Lead Lost',
    'Reason for Opportunity Lost',
    'Last Follow Up Comments',
    'Site Re-Visit Comment',
    'Visit Comments (Not for Reports)'
  ],
  columnMappings: {
    'Opportunity Name': 'name',
    'Mobile': 'phone',
    'Walkin Date': 'date',
    'Name of Closing Manager': 'leadOwner',
    'Opportunity ID': 'id',
    'Walkin Manual Rating': 'managerRating',
    'Walkin Auto Rating': 'rating',
    'Desired Floor Band': 'floorPreference',
    'Desired Facing': 'facing',
    'Desired Carpet Area (Post-Walkin)': 'carpetArea',
    'Stage of Construction (Post-Walkin)': 'constructionStage',
    'Expected Date of Closure': 'timeline',
    'Source of Funding': 'fundingSource',
    'Interested Tower 1': 'towerInterested',
    'Interested Unit 1': 'unitInterested',
    'Occupation': 'occupation',
    'Designation': 'designation',
    'Place of Work (Company Name)': 'company',
    'Location of Residence': 'currentResidence',
    'Location of Work': 'workLocation',
    'Nearest Railway/Metro Station': 'preferredStation',
    'Project': 'projectInterest',
    'Last Follow Up Comments': 'notes'
  }
};

export const BRANDS: Brand[] = [
  {
    id: 'kalpataru',
    name: 'Kalpataru',
    excelSchema: KALPATARU_SCHEMA,
    projects: [
      {
        id: 'kalpataru-estella',
        name: 'Estella',
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
      },
      {
        id: 'kalpataru-eternia',
        name: 'Eternia',
        brandId: 'kalpataru',
        metadata: {
          location: 'Thane West',
          pricing: '₹2.2-3.8 Cr for 2-3 BHK',
          usps: [
            'Modern architecture',
            'Premium lifestyle amenities',
            'Strategic location',
            'Well-connected to Mumbai'
          ],
          competition: ['Lodha Amara', 'Oberoi Sky City'],
          targetAudience: 'Young professionals and families'
        }
      },
      {
        id: 'kalpataru-primera',
        name: 'Primera',
        brandId: 'kalpataru',
        metadata: {
          location: 'Thane West',
          pricing: '₹2.5-4.5 Cr for 2-3 BHK',
          usps: [
            'Premium residences',
            'World-class amenities',
            'Excellent connectivity',
            'Scenic views'
          ],
          competition: ['Lodha Crown', 'Oberoi Sky City'],
          targetAudience: 'Affluent families and professionals'
        }
      }
    ]
  },
  {
    id: 'lodha',
    name: 'Lodha',
    excelSchema: KALPATARU_SCHEMA, // Using Kalpataru schema for now, can be customized later
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
    excelSchema: KALPATARU_SCHEMA, // Using Kalpataru schema for now, can be customized later
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

export const getBrandByProjectId = (projectId: string): Brand | undefined => {
  for (const brand of BRANDS) {
    const project = brand.projects.find(p => p.id === projectId);
    if (project) return brand;
  }
  return undefined;
};
