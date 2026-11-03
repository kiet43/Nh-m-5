import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { AuctionItem } from "../types/auction";
import { placeBid } from "../services/api";
import websocketService from "../services/websocket";

const DetailContainer = styled.section`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
  min-height: 720px;
`;

const ItemHeader = styled.div`
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  padding-bottom: 18px;
  margin-bottom: 18px;
`;

const ItemBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(14, 116, 144, 0.08);
  color: #0f766e;
  border: 1px solid rgba(14, 116, 144, 0.12);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const ItemName = styled.h2`
  margin: 0 0 12px;
  color: #0f172a;
  font-size: clamp(1.7rem, 2vw, 2.25rem);
  line-height: 1.2;
`;

const ItemDescription = styled.p`
  margin: 0;
  color: #475569;
  line-height: 1.6;
  font-size: 0.98rem;
`;

const BidInfo = styled.div`
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CurrentBid = styled.div`
  font-size: clamp(1.8rem, 2vw, 2.5rem);
  font-weight: 900;
  color: #16a34a;
`;

const StartingBid = styled.div`
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 600;
`;

const BidForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
`;

const BidInputWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

const CountdownBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.18);
  color: #0369a1;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
`;

const BidInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 13px 48px 13px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  transition: all 0.2s ease;
  appearance: textfield;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
  }
`;

const QuickSelectButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #cbd5e1;
  }
`;

const QuickMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  padding: 8px;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  overflow: hidden;
`;

const QuickOption = styled.button`
  border: 1px solid rgba(14, 116, 144, 0.15);
  background: linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%);
  color: #0f172a;
  border-radius: 10px;
  padding: 10px 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: linear-gradient(135deg, #ccfbf1 0%, #dbeafe 100%);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const BidButton = styled.button<{ $isRest: boolean }>`
  flex: 1;
  min-width: 180px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: ${(props) =>
    props.$isRest
      ? "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)"
      : "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)"};
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.15);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.96;
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const BidHistory = styled.div`
  margin-top: 30px;
`;

const BidHistoryTitle = styled.h3`
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 1.1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  padding-bottom: 10px;
`;

const BidList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
`;

const BidItem = styled.li`
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const BidAmount = styled.span`
  font-weight: 800;
  color: #15803d;
`;

const BidderName = styled.span`
  color: #1f2937;
  font-weight: 600;
`;

const BidTime = styled.span`
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
`;

const ErrorMessage = styled.div`
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.18);
  color: #991b1b;
  border-radius: 12px;
  margin-bottom: 12px;
  font-weight: 600;
`;

const NotificationPanel = styled.div`
  margin-top: 18px;
  background: rgba(15, 23, 42, 0.96);
  color: white;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: 10px 14px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
`;

const NotificationHeader = styled.div`
  margin: 0 0 8px;
  color: #bfdbfe;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const NotificationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
`;

const NotificationItem = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.86rem;
`;

const NotificationText = styled.span`
  color: #e2e8f0;
  line-height: 1.4;
`;

const NotificationTime = styled.span`
  color: #93c5fd;
  font-size: 0.72rem;
  white-space: nowrap;
`;

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

interface AuctionDetailProps {
  item: AuctionItem;
  bidderName: string;
  websocketConnected: boolean;
  notifications?: Array<{ id: number; message: string; time: string }>;
}

const AuctionDetail: React.FC<AuctionDetailProps> = ({
  item,
  bidderName,
  websocketConnected,
  notifications = [],
}) => {
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isPlacingBid, setIsPlacingBid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickOptions, setShowQuickOptions] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  const quickBidOptions = [10000, 20000, 50000, 100000, 500000];

  useEffect(() => {
    const defaultBid =
      item.bids.length > 0 ? item.currentBid + 100000 : item.startingBid + 100000;
    setBidAmount(defaultBid.toString());
  }, [item]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  };

  const formatQuickBidLabel = (amount: number) => `+${new Intl.NumberFormat("vi-VN").format(amount)}`;

  const formatCountdown = (remainingMs: number) => {
    if (remainingMs <= 0) {
      return "Đã kết thúc";
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const auctionEndsAt = new Date(
    (item.bids[0]?.timestamp ? new Date(item.bids[0].timestamp).getTime() : Date.now()) +
      30 * 60 * 1000 +
      (item.id % 4) * 5 * 60 * 1000
  );
  const timeRemaining = Math.max(0, auctionEndsAt.getTime() - now);

  const handleBidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidAmount(e.target.value);
    setError(null);
  };

  const applyQuickBid = (increment: number) => {
    const base = item.bids.length > 0 ? item.currentBid : item.startingBid;
    const nextBid = base + increment;
    setBidAmount(nextBid.toString());
    setShowQuickOptions(false);
    setError(null);
  };

  const validateBid = (bidValue: number): boolean => {
    if (isNaN(bidValue) || bidValue <= item.currentBid) {
      setError(`Giá đặt phải cao hơn giá hiện tại ${formatVND(item.currentBid)}.`);
      return false;
    }
    if (!bidderName || bidderName.trim() === "" || bidderName === "Khách") {
      setError("Vui lòng nhập tên trước khi đặt giá.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();

    const bidValue = parseFloat(bidAmount);
    if (!validateBid(bidValue)) return;

    if (!websocketConnected) {
      setError("WebSocket chưa kết nối. Không thể đặt giá.");
      return;
    }

    try {
      setIsPlacingBid(true);
      setBidAmount(bidValue.toString());
      websocketService.sendBid(item.id, bidValue, bidderName);
    } catch (err) {
      console.error("Lỗi khi đặt giá qua WebSocket:", err);
      setError("Gửi đặt giá thất bại. Vui lòng thử lại.");
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleWebSocketBid = (e: React.FormEvent) => {
    e.preventDefault();

    const bidValue = parseFloat(bidAmount);
    if (!validateBid(bidValue)) return;

    if (!websocketConnected) {
      setError("WebSocket chưa kết nối. Không thể đặt giá bằng WebSocket.");
      return;
    }

    try {
      setIsPlacingBid(true);
      setBidAmount(bidValue.toString());
      websocketService.sendBid(item.id, bidValue, bidderName);
    } catch (err) {
      console.error("Lỗi khi đặt giá qua WebSocket:", err);
      setError("Gửi đặt giá qua WebSocket thất bại. Vui lòng thử lại.");
    } finally {
      setIsPlacingBid(false);
    }
  };

  return (
    <DetailContainer>
      <ItemHeader>
        <ItemBadge>Đang đấu giá</ItemBadge>
        <ItemName>{item.name}</ItemName>
        <ItemDescription>{item.description}</ItemDescription>
      </ItemHeader>

      <BidInfo>
        <CountdownBadge>⏱ {formatCountdown(timeRemaining)}</CountdownBadge>
        <CurrentBid>Giá hiện tại: {formatVND(item.currentBid)}</CurrentBid>
        <StartingBid>Giá khởi điểm: {formatVND(item.startingBid)}</StartingBid>
      </BidInfo>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <BidForm onSubmit={handleSubmitBid}>
        <BidInputWrap>
          <BidInput
            type="number"
            inputMode="numeric"
            value={bidAmount}
            onChange={handleBidAmountChange}
            placeholder="Nhập số tiền đặt giá"
            min={item.currentBid + 1}
            step="1"
            required
            onClick={() => setShowQuickOptions((prev) => !prev)}
          />
          <QuickSelectButton
            type="button"
            aria-label="Mở lựa chọn mức đặt giá nhanh"
            onClick={() => setShowQuickOptions((prev) => !prev)}
          >
            ▾
          </QuickSelectButton>
          {showQuickOptions && (
            <QuickMenu>
              {quickBidOptions.map((amount) => (
                <QuickOption
                  key={amount}
                  type="button"
                  onClick={() => applyQuickBid(amount)}
                >
                  {formatQuickBidLabel(amount)}
                </QuickOption>
              ))}
            </QuickMenu>
          )}
        </BidInputWrap>
        <ButtonRow>
          <BidButton
            type="submit"
            disabled={
              isPlacingBid ||
              !bidderName ||
              bidderName === "Khách" ||
              !websocketConnected
            }
            $isRest={false}
          >
            Đặt mức giá
          </BidButton>
        </ButtonRow>
      </BidForm>

      <BidHistory>
        <BidHistoryTitle>Lịch sử đặt giá ({item.bids.length})</BidHistoryTitle>
        {item.bids.length === 0 ? (
          <p>Chưa có lượt đặt giá nào. Hãy là người đầu tiên!</p>
        ) : (
          <BidList>
            {[...item.bids]
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
              .map((bid) => (
                <BidItem key={bid.id}>
                  <BidAmount>{formatVND(bid.amount)}</BidAmount>
                  <BidderName>{bid.bidder}</BidderName>
                  <BidTime>{formatDate(bid.timestamp)}</BidTime>
                </BidItem>
              ))}
          </BidList>
        )}
      </BidHistory>

      {notifications.length > 0 && (
        <NotificationPanel>
          <NotificationHeader>Thông báo</NotificationHeader>
          <NotificationList>
            {notifications.map((notification) => (
              <NotificationItem key={notification.id}>
                <NotificationText>{notification.message}</NotificationText>
                <NotificationTime>{notification.time}</NotificationTime>
              </NotificationItem>
            ))}
          </NotificationList>
        </NotificationPanel>
      )}
    </DetailContainer>
  );
};

export default AuctionDetail;
