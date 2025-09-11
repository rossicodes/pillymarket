// KOL trader data - this replaces the external traders.json file
// Contains the 21 tracked KOL wallets for the prediction market

export interface TraderData {
  name: string
  walletAddress: string
  imageUrl: string
  twitterHandle: string
  telegramHandle: boolean
}

export const TRADERS_DATA: TraderData[] = [
  {
    name: 'Cupsey',
    walletAddress: 'suqh5sHtr8HyJ7q8scBimULPkPpA557prMG47xCHQfK',
    imageUrl: 'suqh5sHtr8HyJ7q8scBimULPkPpA557prMG47xCHQfK.png',
    twitterHandle: 'https://x.com/Cupseyy',
    telegramHandle: true,
  },
  {
    name: 'Daumen',
    walletAddress: '8MaVa9kdt3NW4Q5HyNAm1X5LbR8PQRVDc1W8NMVK88D5',
    imageUrl: '8MaVa9kdt3NW4Q5HyNAm1X5LbR8PQRVDc1W8NMVK88D5.png',
    twitterHandle: 'https://x.com/daumenxyz',
    telegramHandle: false,
  },
  {
    name: 'Cented',
    walletAddress: 'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o',
    imageUrl: 'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o.png',
    twitterHandle: 'https://x.com/Cented7',
    telegramHandle: false,
  },
  {
    name: 'xander',
    walletAddress: 'B3wagQZiZU2hKa5pUCj6rrdhWsX3Q6WfTTnki9PjwzMh',
    imageUrl: 'B3wagQZiZU2hKa5pUCj6rrdhWsX3Q6WfTTnki9PjwzMh.png',
    twitterHandle: 'https://x.com/xandereef',
    telegramHandle: true,
  },
  {
    name: 'old',
    walletAddress: 'CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5',
    imageUrl: 'CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5.png',
    twitterHandle: 'https://x.com/old',
    telegramHandle: false,
  },
  {
    name: 'Loopierr',
    walletAddress: '9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL',
    imageUrl: '9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL.png',
    twitterHandle: 'https://x.com/Loopierr',
    telegramHandle: true,
  },
  {
    name: 'TIL',
    walletAddress: 'EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf',
    imageUrl: 'EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf.png',
    twitterHandle: 'https://x.com/tilcrypto',
    telegramHandle: false,
  },
  {
    name: 'Jijo',
    walletAddress: '4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk',
    imageUrl: '4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk.png',
    twitterHandle: 'https://x.com/jijo_exe',
    telegramHandle: true,
  },
  {
    name: 'Orange',
    walletAddress: '2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv',
    imageUrl: '2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv.png',
    twitterHandle: 'https://x.com/OrangeSBS',
    telegramHandle: false,
  },
  {
    name: 'iconXBT',
    walletAddress: '2FbbtmK9MN3Zxkz3AnqoAGnRQNy2SVRaAazq2sFSbftM',
    imageUrl: '2FbbtmK9MN3Zxkz3AnqoAGnRQNy2SVRaAazq2sFSbftM.png',
    twitterHandle: 'https://x.com/iconXBT',
    telegramHandle: false,
  },
  {
    name: 'Cooker',
    walletAddress: '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6',
    imageUrl: '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6.png',
    twitterHandle: 'https://x.com/CookerFlips',
    telegramHandle: true,
  },
  {
    name: 'Insentos',
    walletAddress: '7SDs3PjT2mswKQ7Zo4FTucn9gJdtuW4jaacPA65BseHS',
    imageUrl: '7SDs3PjT2mswKQ7Zo4FTucn9gJdtuW4jaacPA65BseHS.png',
    twitterHandle: 'https://x.com/insentos',
    telegramHandle: true,
  },
  {
    name: 'clukz',
    walletAddress: 'G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC',
    imageUrl: 'G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC.png',
    twitterHandle: 'https://x.com/clukzSOL',
    telegramHandle: false,
  },
  {
    name: 'mercy',
    walletAddress: 'F5jWYuiDLTiaLYa54D88YbpXgEsA6NKHzWy4SN4bMYjt',
    imageUrl: 'F5jWYuiDLTiaLYa54D88YbpXgEsA6NKHzWy4SN4bMYjt.png',
    twitterHandle: 'https://x.com/mercularxs',
    telegramHandle: false,
  },
  {
    name: 'Gake',
    walletAddress: 'DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm',
    imageUrl: 'DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm.png',
    twitterHandle: 'https://x.com/Ga__ke',
    telegramHandle: true,
  },
  {
    name: 'polar',
    walletAddress: 'GL8VLakj5AeAnkVNd4gQAkjXLqAzjeNbNXUQBdo8FwQG',
    imageUrl: 'GL8VLakj5AeAnkVNd4gQAkjXLqAzjeNbNXUQBdo8FwQG.png',
    twitterHandle: 'https://x.com/polarsterrr',
    telegramHandle: false,
  },
  {
    name: 'Publix',
    walletAddress: '86AEJExyjeNNgcp7GrAvCXTDicf5aGWgoERbXFiG1EdD',
    imageUrl: '86AEJExyjeNNgcp7GrAvCXTDicf5aGWgoERbXFiG1EdD.png',
    twitterHandle: 'https://x.com/Publixplayz',
    telegramHandle: false,
  },
  {
    name: '^1s1mple',
    walletAddress: 'AeLaMjzxErZt4drbWVWvcxpVyo8p94xu5vrg41eZPFe3',
    imageUrl: 'AeLaMjzxErZt4drbWVWvcxpVyo8p94xu5vrg41eZPFe3.png',
    twitterHandle: 'https://x.com/s1mple_s1mple',
    telegramHandle: false,
  },
  {
    name: 'Giann',
    walletAddress: 'GNrmKZCxYyNiSUsjduwwPJzhed3LATjciiKVuSGrsHEC',
    imageUrl: 'GNrmKZCxYyNiSUsjduwwPJzhed3LATjciiKVuSGrsHEC.png',
    twitterHandle: 'https://x.com/Giann2K',
    telegramHandle: false,
  },
  {
    name: 'LJC',
    walletAddress: '6HJetMbdHBuk3mLUainxAPpBpWzDgYbHGTS2TqDAUSX2',
    imageUrl: '6HJetMbdHBuk3mLUainxAPpBpWzDgYbHGTS2TqDAUSX2.png',
    twitterHandle: 'https://x.com/OnlyLJC',
    telegramHandle: true,
  },
  {
    name: 'Mitch',
    walletAddress: '4Be9CvxqHW6BYiRAxW9Q3xu1ycTMWaL5z8NX4HR3ha7t',
    imageUrl: '4Be9CvxqHW6BYiRAxW9Q3xu1ycTMWaL5z8NX4HR3ha7t.png',
    twitterHandle: 'https://x.com/idrawline',
    telegramHandle: true,
  },
  {
    name: 'WaiterG',
    walletAddress: '4cXnf2z85UiZ5cyKsPMEULq1yufAtpkatmX4j4DBZqj2',
    imageUrl: '4cXnf2z85UiZ5cyKsPMEULq1yufAtpkatmX4j4DBZqj2.png',
    twitterHandle: 'https://x.com/Waiter1x',
    telegramHandle: true,
  },
  {
    name: 'aloh',
    walletAddress: 'xXpRSpAe1ajq4tJP78tS3X1AqNwJVQ4Vvb1Swg4hHQh',
    imageUrl: 'xXpRSpAe1ajq4tJP78tS3X1AqNwJVQ4Vvb1Swg4hHQh.png',
    twitterHandle: 'https://x.com/alohquant',
    telegramHandle: true,
  },
]
