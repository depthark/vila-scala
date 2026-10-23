export const site = {
  name: 'Vila SCALA',
  url: 'https://www.vila-scala.cz',
  email: 'info@vila-scala.cz',
  phone: '+420601221551',
  phoneDisplay: '+420 601 221 551',
  street: 'Veslařská 1039/144',
  district: 'Jundrov',
  city: 'Brno',
  postalCode: '637 00',
  country: 'CZ',
  countryName: { cs: 'Česká republika', en: 'Czech Republic' },
  geo: { lat: 49.2072, lng: 16.5586 },
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Vesla%C5%99sk%C3%A1%201039%2F144%2C%20Brno-Jundrov',
  virtualTourUrl: 'https://my.matterport.com/show/?m=HrbBwzj2ryq',
  foundingYear: 2024,
  lawFirm: 'Krejčí, Rajf & partneři, s.r.o.',
  /**
   * Web3Forms access key, embedded in the form as on anewstyle.cz. It is public
   * by design and delivers to the address it was created for, which must be
   * info@vila-scala.cz. While it is empty the contact form falls back to
   * opening the visitor's mail app.
   */
  web3formsKey: '' as string,
} as const;
