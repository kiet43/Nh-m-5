import styled from "styled-components";
import { AuctionItem } from "../types/auction";

const ListContainer = styled.aside`
  width: 32%;
  min-width: 290px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 20px;
`;

const ListTitle = styled.h2`
  margin: 0 0 16px;
  color: #0f172a;
  font-size: 1.45rem;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
`;

const ItemsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ItemCard = styled.li<{ selected: boolean }>`
  padding: 12px;
  border-radius: 18px;
  cursor: pointer;
  background: ${(props) =>
    props.selected
      ? "linear-gradient(135deg, #0f766e 0%, #2563eb 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)"};
  border: 1px solid ${(props) => (props.selected ? "transparent" : "rgba(148, 163, 184, 0.25)")};
  color: ${(props) => (props.selected ? "white" : "#1f2937")};
  box-shadow: ${(props) =>
    props.selected
      ? "0 18px 32px rgba(37, 99, 235, 0.2)"
      : "0 10px 24px rgba(15, 23, 42, 0.04)"};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.selected
        ? "0 18px 36px rgba(37, 99, 235, 0.28)"
        : "0 12px 26px rgba(15, 23, 42, 0.08)"};
  }
`;

const ItemImage = styled.img`
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 12px;
  display: block;
  background: #e2e8f0;
`;

const ItemName = styled.h3`
  margin: 0 0 8px;
  font-size: 1.08rem;
  font-weight: 800;
`;

const ItemDescription = styled.p`
  margin: 0 0 12px;
  color: inherit;
  opacity: 0.8;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const ItemPrice = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  color: inherit;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 7px 10px;
  width: fit-content;
`;

const EmptyState = styled.p`
  margin: 0;
  color: #475569;
  font-style: italic;
`;

const LoadingSpinner = styled.div`
  padding: 24px 12px;
  text-align: center;
  color: #475569;
  font-weight: 600;
`;

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

interface AuctionItemListProps {
  items: AuctionItem[];
  isLoading: boolean;
  selectedItemId?: number;
  onSelectItem: (item: AuctionItem) => void;
}

const AuctionItemList: React.FC<AuctionItemListProps> = ({
  items,
  isLoading,
  selectedItemId,
  onSelectItem,
}) => {
  if (isLoading) {
    return (
      <ListContainer>
        <ListTitle>Danh sách sản phẩm</ListTitle>
        <LoadingSpinner>Đang tải sản phẩm...</LoadingSpinner>
      </ListContainer>
    );
  }

  return (
    <ListContainer>
      <ListTitle>Danh sách sản phẩm</ListTitle>
      {items.length === 0 ? (
        <EmptyState>Hiện chưa có sản phẩm nào cho phiên đấu giá.</EmptyState>
      ) : (
        <ItemsList>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              selected={item.id === selectedItemId}
              onClick={() => onSelectItem(item)}
            >
              <ItemImage
                src={
                  item.image ||
                  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80"
                }
                alt={item.name}
              />
              <ItemName>{item.name}</ItemName>
              <ItemDescription>{item.description}</ItemDescription>
              <ItemPrice>
                <span>Giá hiện tại</span>
                <strong>{formatVND(item.currentBid)}</strong>
              </ItemPrice>
            </ItemCard>
          ))}
        </ItemsList>
      )}
    </ListContainer>
  );
};

export default AuctionItemList;
