const mockResults = [
  {
    id: "21341345",
    type: "bioprobe",
    location: "Charité Campus Mitte",
    date: "2025-03-25T00:00:00Z",
    contents: "Blut",
    links: {
      group: 'Group',
      pseudonym: "BLV-B-17263",
      children: []
      // limit to one level
    },
    identifiers: {
      MOI: "645391730495728"
    }, 
  },
  {
    id: "21341346",
    type: "bioprobe",
    location: "Charité Campus Mitte",
    date: "2025-03-25T00:00:00Z",
    contents: "Urin",
    links: {
      group: 'Group',
      pseudonym: "BLV-B-47562",
      children: []
    },
    identifiers: {
      MOI: "362514386970485"
    }
  },
  {
    id: "21341347",
    type: "bioprobe",
    location: "Charité Campus Mitte",
    date: "2025-03-25T00:00:00Z",
    contents: "Gewebe",
    links: {
      group: 'Group',
      pseudonym: "BLV-B-19385",
      children: []
    },
    identifiers: {
      MOI: "172640982536183"
    }
  },
  {
    id: "21341348",
    type: "bioprobe",
    location: "Charité Campus Mitte",
    date: "2025-03-25T00:00:00Z",
    contents: "Speichel",
    links: {
      group: 'Group',
      pseudonym: "BLV-B-85637",
      children: []
    },
    identifiers: {
      MOI: "216496759304927"
    }
  },
  {
    id: "21341349",
    type: "bioprobe",
    location: "Charité Campus Mitte",
    date: "2025-03-25T00:00:00Z",
    contents: "Lumbalflüssigkeit",
    links: {
      group: 'Group',
      pseudonym: "BLV-B-36597",
      children: []
    },
    identifiers: {
      MOI: "174637596874238",
    }
  }
]

const BioProbeService = {
  searchBioProbe: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockResults), 1000);
    });
  }
};

export default BioProbeService;