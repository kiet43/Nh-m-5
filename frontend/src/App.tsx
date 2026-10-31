import { useEffect, useState } from "react";
import styled from "styled-components";
import { AuctionItem } from "./types/auction";
import { fetchAllItems } from "./services/api";
import websocketService from "./services/websocket";
import AuctionItemList from "./components/AuctionItemList";
import AuctionDetail from "./components/AuctionDetail";

const AppContainer = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.2), transparent 30%),
    radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.18), transparent 35%),
    linear-gradient(135deg, #f8fafc 0%, #edf6f5 42%, #eef4ff 100%);
  color: #17212f;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  padding: 32px 20px 40px;
`;

const Header = styled.header`
  max-width: 1200px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #0f172a 0%, #102d47 35%, #0f766e 100%);
  color: white;
  padding: 28px 30px;
  border-radius: 28px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HeaderBadge = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #dbeafe;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const AppTitle = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.04em;
  line-height: 1.1;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(239, 246, 255, 0.82);
  font-size: 0.95rem;
`;

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  background: ${(props) => (props.$connected ? "rgba(34, 197, 94, 0.16)" : "rgba(239, 68, 68, 0.18)")};
  color: white;
  border: 1px solid ${(props) => (props.$connected ? "rgba(134, 239, 172, 0.5)" : "rgba(252, 165, 165, 0.4)")};
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
`;

const StatusDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: inline-block;
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ErrorBanner = styled.div`
  max-width: 1200px;
  margin: 0 auto 18px;
  padding: 14px 18px;
  background: rgba(239, 68, 68, 0.1);
  color: #991b1b;
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 14px;
  font-weight: 600;
`;

const UserInfo = styled.div`
  max-width: 1200px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-start;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.76);
  padding: 16px 20px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(8px);
`;

const UserLabel = styled.label`
  font-weight: 700;
  color: #1e293b;
`;

const UserInput = styled.input`
  padding: 12px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  width: min(100%, 260px);
  font-size: 15px;
  background: white;
  color: #0f172a;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
  }
`;

const Footer = styled.footer`
  text-align: center;
  margin-top: 24px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
`;

function App() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [bidderName, setBidderName] = useState<string>("Khách");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoadingItems(true);
        const data = await fetchAllItems();
        setItems(data);
        setIsLoadingItems(false);
      } catch (error) {
        console.error("Lỗi khi tải danh sách sản phẩm:", error);
        setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
        setIsLoadingItems(false);
      }
    };

    loadItems();
  }, []);

  useEffect(() => {
    websocketService.onConnect((connected) => {
      setIsConnected(connected);

      if (!connected) {
        setError("Mất kết nối WebSocket. Đang thử kết nối lại...");
      } else {
        setError(null);
      }
    });

    websocketService.onInitialData((initialItems) => {
      setItems(initialItems);
      if (!selectedItem && initialItems.length > 0) {
        setSelectedItem(initialItems[0]);
      }
    });

    websocketService.onItemUpdate((updatedItem) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      if (selectedItem && selectedItem.id === updatedItem.id) {
        setSelectedItem(updatedItem);
      }
    });

    websocketService.onError((message) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    });

    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedItem) {
      const updatedSelectedItem = items.find(
        (item) => item.id === selectedItem.id
      );
      if (updatedSelectedItem) {
        setSelectedItem(updatedSelectedItem);
      }
    }
  }, [items, selectedItem]);

  const handleSelectItem = (item: AuctionItem) => {
    setSelectedItem(item);
  };

  const handleBidderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidderName(e.target.value);
  };

  return (
    <AppContainer>
      <Header>
        <HeaderTop>
          <HeaderMeta>
            <HeaderBadge>Live Auction</HeaderBadge>
            <AppTitle>Sàn đấu giá trực tiếp</AppTitle>
            <Subtitle>Theo dõi giá, đặt giá và cập nhật tức thì qua WebSocket</Subtitle>
          </HeaderMeta>
          <ConnectionStatus $connected={isConnected}>
            <StatusDot />
            {isConnected ? "Đã kết nối" : "Đang kết nối..."}
          </ConnectionStatus>
        </HeaderTop>
      </Header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <UserInfo>
        <UserLabel htmlFor="bidderName">Tên của bạn:</UserLabel>
        <UserInput
          type="text"
          id="bidderName"
          value={bidderName}
          onChange={handleBidderNameChange}
          placeholder="Nhập tên của bạn"
        />
      </UserInfo>

      <MainContent>
        <AuctionItemList
          items={items}
          isLoading={isLoadingItems}
          selectedItemId={selectedItem?.id}
          onSelectItem={handleSelectItem}
        />

        {selectedItem && (
          <AuctionDetail
            item={selectedItem}
            bidderName={bidderName}
            websocketConnected={isConnected}
          />
        )}
      </MainContent>

      <Footer>
        <p>Live Auction Platform — Demo WebSocket</p>
      </Footer>
    </AppContainer>
  );
}

export default App;
