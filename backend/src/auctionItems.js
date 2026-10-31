/**
 * Default auction items to use
 */
const auctionItems = [
  {
    id: 1,
    name: "Bộ sưu tập gốm sứ cổ",
    description: "Bộ sưu tập gốm sứ cổ mang phong cách truyền thống Việt Nam, được làm thủ công và có giá trị nghệ thuật cao.",
    image:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
    startingBid: 1200000,
    currentBid: 1200000,
    bids: [],
  },
  {
    id: 2,
    name: "Bức tranh sơn dầu Việt Nam",
    description: "Bức tranh sơn dầu Việt Nam, nguyên tác của họa sĩ địa phương, thể hiện tinh hoa nghệ thuật và văn hóa.",
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80",
    startingBid: 2500000,
    currentBid: 2500000,
    bids: [],
  },
  {
    id: 3,
    name: "Bộ bàn ghế gỗ tự nhiên",
    description: "Bộ bàn ghế gỗ tự nhiên cao cấp dành cho phòng khách, mang vẻ đẹp mộc mạc và sang trọng của Việt Nam.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    startingBid: 4200000,
    currentBid: 4200000,
    bids: [],
  },
];

module.exports = { auctionItems };
