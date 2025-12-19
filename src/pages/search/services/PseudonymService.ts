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
