const mockPseudonym = {
  id: "12345",
  pseudonym: "GRP-MRT-362746",
  group: "GRP-MRT",
  parent: "Group",
  children: [],
  // limit to one level
  createdOn: "2024-03-10T12:00:00Z",
  expiresOn: "2026-03-10T12:00:00Z",
}

class PseudonymService {
  static async searchPseudonym(): Promise<any> {
    // Simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockPseudonym)
      }, 1000)
    })
  }
}

export default PseudonymService
