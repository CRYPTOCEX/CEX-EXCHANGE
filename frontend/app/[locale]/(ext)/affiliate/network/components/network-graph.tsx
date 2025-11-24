"use client";

import { CardContent } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import type { NetworkData } from "@/store/affiliate/network-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Minus,
  Plus,
  ZoomIn,
  Mail,
  User,
  Users,
  Calendar,
  ArrowUpRight,
  Network,
  X,
  DollarSign,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface ForceDirectedGraphProps {
  networkData: NetworkData;
  mlmSystem: "DIRECT" | "BINARY" | "UNILEVEL" | null;
}

interface Node {
  id: string;
  name: string;
  avatar: string;
  level: number;
  radius: number;
  color: string;
  x: number;
  y: number;
  fixed: boolean;
  role?: string;
  joinDate?: string;
  status?: string;
  earnings?: number;
  teamSize?: number;
  performance?: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

export function NetworkGraph({
  networkData,
  mlmSystem,
}: ForceDirectedGraphProps) {
  const t = useTranslations("ext");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: Node[]; links: Link[] }>({
    nodes: [],
    links: [],
  });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Create graph data based on the network data with FIXED positions
  const createGraphData = () => {
    const centerX = 400;
    const centerY = 300;

    // Create a central node for the current user
    const nodes: Node[] = [
      {
        id: networkData.user.id,
        name: `${networkData.user.firstName} ${networkData.user.lastName}`,
        avatar: networkData.user.avatar || "",
        level: 0,
        radius: 30,
        color: "#4f46e5",
        role: networkData.user.role || "You",
        joinDate: networkData.user.joinDate || "",
        status: networkData.user.status || "ACTIVE",
        earnings: networkData.user.earnings || 0,
        teamSize: networkData.user.teamSize || 0,
        performance: networkData.user.performance || 0,
        x: centerX,
        y: centerY,
        fixed: true,
      },
    ];

    const links: Link[] = [];

    // Add upline if exists - position ABOVE the center
    if (networkData.upline) {
      nodes.push({
        id: networkData.upline.id || "upline",
        name: `${networkData.upline.firstName || ""} ${networkData.upline.lastName || ""}`,
        avatar: networkData.upline.avatar || "",
        level: -1,
        radius: 25,
        color: "#6366f1",
        role: "Upline",
        joinDate: networkData.upline.joinDate || "",
        status: networkData.upline.status || "ACTIVE",
        earnings: networkData.upline.earnings || 0,
        teamSize: networkData.upline.teamSize || 0,
        performance: networkData.upline.performance || 0,
        x: centerX,
        y: centerY - 120,
        fixed: true,
      });

      links.push({
        source: networkData.upline.id || "upline",
        target: networkData.user.id,
        value: 3,
      });
    }

    // Add referrals based on the MLM system with FIXED positions
    if (mlmSystem === "DIRECT" && networkData.referrals) {
      // Position direct referrals in a semi-circle below the center
      const referralCount = networkData.referrals.length;

      networkData.referrals.forEach((referral, index) => {
        if (referral.referred) {
          // Calculate position in a semi-circle
          const angle =
            Math.PI * (0.2 + 0.6 * (index / Math.max(1, referralCount - 1)));
          const distance = 150;
          const x = centerX + distance * Math.cos(angle);
          const y = centerY + distance * Math.sin(angle);

          const id = referral.id || `referral-${index}`;
          nodes.push({
            id,
            name: `${referral.referred.firstName || ""} ${referral.referred.lastName || ""}`,
            avatar: referral.referred.avatar || "",
            level: 1,
            radius: 22,
            color: "#60a5fa",
            role: "Direct Referral",
            joinDate: referral.createdAt || "",
            status: referral.status || "ACTIVE",
            earnings: referral.earnings || 0,
            teamSize: referral.teamSize || 0,
            performance: referral.performance || 0,
            x,
            y,
            fixed: false,
          });

          links.push({
            source: networkData.user.id,
            target: id,
            value: 2,
          });

          // Add second-level referrals if they exist in the data
          if (referral.downlines && referral.downlines.length > 0) {
            referral.downlines.forEach((downline, i) => {
              const subAngle =
                angle + ((i / referral.downlines!.length) * 0.4 - 0.2);
              const subDistance = distance + 80;
              const subX = centerX + subDistance * Math.cos(subAngle);
              const subY = centerY + subDistance * Math.sin(subAngle);

              const subId = downline.id || `sub-${index}-${i}`;

              nodes.push({
                id: subId,
                name: `${downline.firstName || ""} ${downline.lastName || ""}`,
                avatar: downline.avatar || "",
                level: 2,
                radius: 18,
                color: "#93c5fd",
                role: downline.role || "Team Member",
                status: downline.status || "ACTIVE",
                joinDate: downline.joinDate || "",
                earnings: downline.earnings || 0,
                teamSize: downline.teamSize || 0,
                performance: downline.performance || 0,
                x: subX,
                y: subY,
                fixed: false,
              });

              links.push({
                source: id,
                target: subId,
                value: 1,
              });
            });
          }
        }
      });
    } else if (mlmSystem === "BINARY" && networkData.binaryStructure) {
      // Position binary structure in a tree layout

      // Add left child
      if (networkData.binaryStructure.left) {
        const leftId = networkData.binaryStructure.left.id || "left";
        nodes.push({
          id: leftId,
          name: `${networkData.binaryStructure.left.firstName || ""} ${networkData.binaryStructure.left.lastName || ""}`,
          avatar: networkData.binaryStructure.left.avatar || "",
          level: 1,
          radius: 24,
          color: "#3b82f6",
          role: "Left Leg",
          joinDate: networkData.binaryStructure.left.joinDate || "",
          status: networkData.binaryStructure.left.status || "ACTIVE",
          earnings: networkData.binaryStructure.left.earnings || 0,
          teamSize: networkData.binaryStructure.left.teamSize || 0,
          performance: networkData.binaryStructure.left.performance || 0,
          x: centerX - 120,
          y: centerY + 120,
          fixed: true,
        });

        links.push({
          source: networkData.user.id,
          target: leftId,
          value: 2,
        });

        // Add left team members if they exist in the data
        if (networkData.binaryStructure.left.downlines) {
          networkData.binaryStructure.left.downlines.forEach((member, i) => {
            const childId = member.id || `left-child-${i}`;
            nodes.push({
              id: childId,
              name: `${member.firstName || ""} ${member.lastName || ""}`,
              avatar: member.avatar || "",
              level: 2,
              radius: 18,
              color: "#93c5fd",
              role: "Left Team Member",
              status: member.status || "ACTIVE",
              joinDate: member.joinDate || "",
              earnings: member.earnings || 0,
              teamSize: member.teamSize || 0,
              performance: member.performance || 0,
              x: centerX - 180 + i * 60,
              y: centerY + 200,
              fixed: true,
            });

            links.push({
              source: leftId,
              target: childId,
              value: 1,
            });
          });
        }
      }

      // Add right child
      if (networkData.binaryStructure.right) {
        const rightId = networkData.binaryStructure.right.id || "right";
        nodes.push({
          id: rightId,
          name: `${networkData.binaryStructure.right.firstName || ""} ${networkData.binaryStructure.right.lastName || ""}`,
          avatar: networkData.binaryStructure.right.avatar || "",
          level: 1,
          radius: 24,
          color: "#3b82f6",
          role: "Right Leg",
          joinDate: networkData.binaryStructure.right.joinDate || "",
          status: networkData.binaryStructure.right.status || "ACTIVE",
          earnings: networkData.binaryStructure.right.earnings || 0,
          teamSize: networkData.binaryStructure.right.teamSize || 0,
          performance: networkData.binaryStructure.right.performance || 0,
          x: centerX + 120,
          y: centerY + 120,
          fixed: true,
        });

        links.push({
          source: networkData.user.id,
          target: rightId,
          value: 2,
        });

        // Add right team members if they exist in the data
        if (networkData.binaryStructure.right.downlines) {
          networkData.binaryStructure.right.downlines.forEach((member, i) => {
            const childId = member.id || `right-child-${i}`;
            nodes.push({
              id: childId,
              name: `${member.firstName || ""} ${member.lastName || ""}`,
              avatar: member.avatar || "",
              level: 2,
              radius: 18,
              color: "#93c5fd",
              role: "Right Team Member",
              status: member.status || "ACTIVE",
              joinDate: member.joinDate || "",
              earnings: member.earnings || 0,
              teamSize: member.teamSize || 0,
              performance: member.performance || 0,
              x: centerX + 180 - i * 60,
              y: centerY + 200,
              fixed: true,
            });

            links.push({
              source: rightId,
              target: childId,
              value: 1,
            });
          });
        }
      }
    } else if (mlmSystem === "UNILEVEL" && networkData.levels) {
      // Position unilevel structure in a hierarchical layout
      let currentY = centerY + 100;

      // Add nodes for each level
      networkData.levels.forEach((level, levelIndex) => {
        const levelWidth = level.length;
        const levelSpacing = 500 / (levelWidth + 1);

        level.forEach((member, memberIndex) => {
          const id = member.id || `level-${levelIndex}-${memberIndex}`;
          const x = centerX - 250 + (memberIndex + 1) * levelSpacing;

          nodes.push({
            id,
            name: `${member.firstName || ""} ${member.lastName || ""}`,
            avatar: member.avatar || "",
            level: levelIndex + 1,
            radius: 22 - levelIndex * 2,
            color: levelColors[levelIndex % levelColors.length],
            role: member.role || `Level ${levelIndex + 1} Member`,
            joinDate: member.joinDate || "",
            status: member.status || "ACTIVE",
            earnings: member.earnings || 0,
            teamSize: member.teamSize || 0,
            performance: member.performance || 0,
            x,
            y: currentY,
            fixed: true,
          });

          if (levelIndex === 0) {
            // First level connects to the user
            links.push({
              source: networkData.user.id,
              target: id,
              value: 2,
            });
          } else {
            // Other levels connect to a node from the previous level
            const parentLevelSize = networkData.levels![levelIndex - 1].length;
            const parentIndex = memberIndex % parentLevelSize;
            const parentId =
              networkData.levels![levelIndex - 1][parentIndex].id ||
              `level-${levelIndex - 1}-${parentIndex}`;

            links.push({
              source: parentId,
              target: id,
              value: 1,
            });
          }
        });

        currentY += 100;
      });
    }

    return { nodes, links };
  };

  useEffect(() => {
    if (networkData) {
      const data = createGraphData();
      setGraphData(data);
    }
  }, [networkData, mlmSystem]);

  useEffect(() => {
    if (!canvasRef.current || !graphData.nodes.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Set canvas dimensions with device pixel ratio for sharp rendering
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Load avatars with proper error handling
    const avatars: Record<string, HTMLImageElement> = {};
    const loadAvatars = async () => {
      const imagePromises = graphData.nodes.map((node) => {
        if (node.avatar) {
          return new Promise<void>((resolve) => {
            const img = document.createElement("img");
            img.crossOrigin = "anonymous";
            img.src =
              node.avatar ||
              `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(node.name)}`;

            img.onload = () => {
              avatars[node.id] = img;
              resolve();
            };

            img.onerror = () => {
              // Use a fallback for broken images
              const fallbackImg = document.createElement("img");
              fallbackImg.crossOrigin = "anonymous";
              fallbackImg.src = `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(node.name)}`;

              fallbackImg.onload = () => {
                avatars[node.id] = fallbackImg;
                resolve();
              };

              fallbackImg.onerror = () => {
                // If even the fallback fails, just resolve without an image
                resolve();
              };
            };
          });
        }
        return Promise.resolve();
      });

      await Promise.all(imagePromises);
    };

    loadAvatars();

    // Check if mouse is over a node
    const getNodeAtPosition = (x: number, y: number): Node | null => {
      // Apply scaling and offset to mouse coordinates
      const adjustedX = x / scale - offset.x;
      const adjustedY = y / scale - offset.y;

      for (const node of graphData.nodes) {
        const dx = adjustedX - node.x;
        const dy = adjustedY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= node.radius) {
          return node;
        }
      }
      return null;
    };

    // Draw function
    const draw = () => {
      // Clear canvas
      ctx.clearRect(
        0,
        0,
        canvas.width / window.devicePixelRatio,
        canvas.height / window.devicePixelRatio
      );

      // Apply transformations for pan and zoom
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Draw links with enhanced visuals
      graphData.links.forEach((link) => {
        const source = graphData.nodes.find((n) => n.id === link.source);
        const target = graphData.nodes.find((n) => n.id === link.target);

        if (source && target) {
          const isHighlighted =
            (hoveredNode &&
              (source.id === hoveredNode.id || target.id === hoveredNode.id)) ||
            (selectedNode &&
              (source.id === selectedNode.id || target.id === selectedNode.id));

          // Calculate link width based on value and highlight state
          const linkWidth = isHighlighted ? link.value + 1.5 : link.value;

          // Draw link with enhanced gradient
          const gradient = ctx.createLinearGradient(
            source.x,
            source.y,
            target.x,
            target.y
          );

          if (isHighlighted) {
            gradient.addColorStop(0, source.color);
            gradient.addColorStop(1, target.color);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = linkWidth;

            // Add glow effect for highlighted links
            ctx.shadowColor = source.color;
            ctx.shadowBlur = 8;
          } else {
            gradient.addColorStop(0, `${source.color}60`); // 40% opacity
            gradient.addColorStop(1, `${target.color}60`); // 40% opacity
            ctx.strokeStyle = gradient;
            ctx.lineWidth = linkWidth;
            ctx.shadowBlur = 0;
          }

          // Draw the main connection line
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();

          // Reset shadow
          ctx.shadowBlur = 0;

          // Draw direction indicator (small circle) for highlighted links
          if (isHighlighted) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Position the indicator 60% of the way from source to target
            const indicatorX = source.x + dx * 0.6;
            const indicatorY = source.y + dy * 0.6;

            ctx.beginPath();
            ctx.arc(indicatorX, indicatorY, linkWidth + 1, 0, 2 * Math.PI);
            ctx.fillStyle = target.color;
            ctx.fill();
          }
        }
      });

      // Draw nodes with enhanced visuals
      graphData.nodes.forEach((node) => {
        const isHighlighted =
          (hoveredNode && node.id === hoveredNode.id) ||
          (selectedNode && node.id === selectedNode.id);
        const isDragging = draggedNodeId === node.id;

        // Draw outer glow for highlighted nodes
        if (isHighlighted) {
          ctx.beginPath();
          const gradient = ctx.createRadialGradient(
            node.x,
            node.y,
            node.radius,
            node.x,
            node.y,
            node.radius * 1.8
          );
          gradient.addColorStop(0, `${node.color}40`);
          gradient.addColorStop(1, `${node.color}00`);
          ctx.fillStyle = gradient;
          ctx.arc(node.x, node.y, node.radius * 1.8, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw node shadow with more depth
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();

        // Draw node circle with enhanced gradient
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        // Create gradient fill with more vibrant colors
        const gradient = ctx.createRadialGradient(
          node.x - node.radius / 3,
          node.y - node.radius / 3,
          0,
          node.x,
          node.y,
          node.radius
        );

        if (isHighlighted || isDragging) {
          gradient.addColorStop(0, lightenColor(node.color, 40));
          gradient.addColorStop(0.7, lightenColor(node.color, 10));
          gradient.addColorStop(1, node.color);
          ctx.fillStyle = gradient;
        } else {
          gradient.addColorStop(0, lightenColor(node.color, 30));
          gradient.addColorStop(0.7, lightenColor(node.color, 5));
          gradient.addColorStop(1, node.color);
          ctx.fillStyle = gradient;
        }

        ctx.fill();

        // Draw avatar if available with improved error handling
        const avatar = avatars[node.id];
        if (avatar && avatar.complete && avatar.naturalHeight !== 0) {
          try {
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius - 2, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(
              avatar,
              node.x - node.radius + 2,
              node.y - node.radius + 2,
              (node.radius - 2) * 2,
              (node.radius - 2) * 2
            );
            ctx.restore();
          } catch (e) {
            console.error("Error drawing avatar:", e);
            drawInitials(ctx, node);
          }
        } else {
          drawInitials(ctx, node);
        }

        // Draw node border with enhanced glow effect
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        if (isHighlighted || isDragging) {
          // Draw enhanced glow effect
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 20;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
        } else {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Draw pulsing effect for selected node
        if (selectedNode && node.id === selectedNode.id) {
          const now = Date.now();
          const pulseSize = Math.sin(now * 0.005) * 5 + 10;

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + pulseSize, 0, 2 * Math.PI);
          ctx.strokeStyle = `${node.color}40`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw status indicator with enhanced styling
        if (node.status) {
          const statusColor = node.status === "ACTIVE" ? "#10b981" : "#f59e0b";

          // Draw glow behind status indicator
          ctx.beginPath();
          ctx.arc(
            node.x + node.radius - 4,
            node.y - node.radius + 4,
            8,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = `${statusColor}40`;
          ctx.fill();

          // Draw status indicator
          ctx.beginPath();
          ctx.arc(
            node.x + node.radius - 4,
            node.y - node.radius + 4,
            6,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = statusColor;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw node name with improved background for better readability
        if (
          node.name &&
          (isHighlighted || node.level <= 1 || node.name.length <= 2)
        ) {
          const fontSize = isHighlighted ? 14 : 12;
          ctx.font = `${isHighlighted ? "bold" : "normal"} ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textAlign = "center";

          const textWidth = ctx.measureText(node.name).width + 16;
          const textHeight = fontSize + 8;

          // Draw text background with rounded corners
          const cornerRadius = 4;
          roundRect(
            ctx,
            node.x - textWidth / 2,
            node.y + node.radius + 4,
            textWidth,
            textHeight,
            cornerRadius,
            isHighlighted
              ? "rgba(255, 255, 255, 0.95)"
              : "rgba(255, 255, 255, 0.85)"
          );

          // Draw text
          ctx.fillStyle = isHighlighted ? "#000000" : "#333333";
          ctx.fillText(
            node.name,
            node.x,
            node.y + node.radius + 4 + fontSize * 0.7
          );
        }
      });

      // Restore canvas transformations
      ctx.restore();

      // Continue animation
      animationFrameId = requestAnimationFrame(draw);
    };

    // Helper function to draw initials
    const drawInitials = (ctx: CanvasRenderingContext2D, node: Node) => {
      ctx.fillStyle = lightenColor(node.color, 15);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius - 2, 0, 2 * Math.PI);
      ctx.fill();

      const nameParts = node.name.split("untitled");
      let initials = "";

      if (nameParts.length >= 2) {
        initials = `${nameParts[0][0] || ""}${nameParts[1][0] || ""}`;
      } else if (node.name.length > 0) {
        initials = node.name[0] || "";
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${node.radius * 0.7}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, node.x, node.y);
    };

    // Helper function to lighten a color
    const lightenColor = (color: string, percent: number): string => {
      const num = Number.parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = ((num >> 8) & 0x00ff) + amt;
      const B = (num & 0x0000ff) + amt;

      return `#${(
        0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)}`;
    };

    // Helper function to draw rounded rectangles
    const roundRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
      fill: string
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    // Start animation
    draw();

    // Handle mouse events for interactivity
    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left) * window.devicePixelRatio;
      const mouseY = (event.clientY - rect.top) * window.devicePixelRatio;

      // Check if we're clicking on a node
      const node = getNodeAtPosition(mouseX, mouseY);

      if (node) {
        // Set the node as selected on click with visual feedback
        setSelectedNode(node);

        // Add subtle animation effect when clicking a node
        const nodeIndex = graphData.nodes.findIndex((n) => n.id === node.id);
        if (nodeIndex !== -1 && !node.fixed) {
          // Make the node slightly larger for a moment to give click feedback
          const updatedNodes = [...graphData.nodes];
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            radius: updatedNodes[nodeIndex].radius * 1.1, // Temporarily increase size
          };

          setGraphData({
            ...graphData,
            nodes: updatedNodes,
          });

          // Reset size after animation
          setTimeout(() => {
            const resetNodes = [...graphData.nodes];
            resetNodes[nodeIndex] = {
              ...resetNodes[nodeIndex],
              radius: resetNodes[nodeIndex].radius / 1.1, // Reset to original size
            };

            setGraphData({
              ...graphData,
              nodes: resetNodes,
            });
          }, 200);
        }

        // Only allow dragging non-fixed nodes
        if (!node.fixed) {
          setDraggedNodeId(node.id);
          canvas.style.cursor = "grabbing";
        }
      } else {
        // If not clicking on a node, start panning
        setIsDragging(true);
        setDragStart({
          x: event.clientX - offset.x * scale,
          y: event.clientY - offset.y * scale,
        });
        canvas.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left) * window.devicePixelRatio;
      const mouseY = (event.clientY - rect.top) * window.devicePixelRatio;

      // Update hovered node
      const node = getNodeAtPosition(mouseX, mouseY);

      if (node !== hoveredNode) {
        setHoveredNode(node);
        // Change cursor to pointer when over a node
        canvas.style.cursor = node
          ? "pointer"
          : isDragging
            ? "grabbing"
            : "grab";
      }

      // Handle dragging a node
      if (draggedNodeId) {
        const nodeIndex = graphData.nodes.findIndex(
          (n) => n.id === draggedNodeId
        );
        if (nodeIndex !== -1) {
          const updatedNodes = [...graphData.nodes];
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            x: (event.clientX - rect.left) / scale - offset.x,
            y: (event.clientY - rect.top) / scale - offset.y,
          };
          setGraphData({
            ...graphData,
            nodes: updatedNodes,
          });
        }
      }

      // Handle panning the canvas
      if (isDragging) {
        setOffset({
          x: (event.clientX - dragStart.x) / scale,
          y: (event.clientY - dragStart.y) / scale,
        });
      }
    };

    const handleMouseUp = () => {
      setDraggedNodeId(null);
      setIsDragging(false);
      canvas.style.cursor = hoveredNode ? "pointer" : "grab";
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Calculate new scale
      const delta = -event.deltaY * 0.001;
      const newScale = Math.max(0.1, Math.min(5, scale + delta));

      // Calculate new offset to zoom toward mouse position
      const scaleRatio = newScale / scale;
      const newOffsetX =
        mouseX / scale - (mouseX / scale - offset.x) * scaleRatio;
      const newOffsetY =
        mouseY / scale - (mouseY / scale - offset.y) * scaleRatio;

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    graphData,
    scale,
    offset,
    isDragging,
    dragStart,
    hoveredNode,
    selectedNode,
    draggedNodeId,
  ]);

  // Reset view to center and default zoom
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-4">
      <Card className="w-full h-[600px] overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full cursor-grab" />

        {/* Node details side panel */}
        {selectedNode && (
          <div className="absolute top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-sm border-l shadow-xl p-4 overflow-y-auto transition-transform duration-300 transform translate-x-0 animate-in slide-in-from-right">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{t("member_profile")}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Profile header */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={selectedNode.avatar || ""} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {selectedNode.name
                        .split("untitled")
                        .map((n) => n[0] || "")
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {selectedNode.status && (
                    <Badge
                      variant={
                        selectedNode.status === "ACTIVE"
                          ? "success"
                          : "secondary"
                      }
                      className="absolute -bottom-2 right-0 px-2 py-1"
                    >
                      {selectedNode.status}
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold">{selectedNode.name}</h3>
                <p className="text-muted-foreground">{selectedNode.role}</p>
                {selectedNode.joinDate && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {t("Joined")}
                      {selectedNode.joinDate}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Stats cards */}
              {selectedNode.earnings !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center">
                        <DollarSign className="h-5 w-5 text-primary mb-1" />
                        <p className="text-xs text-muted-foreground">
                          {t("Earnings")}
                        </p>
                        <p className="text-lg font-bold">
                          / $
                          {selectedNode.earnings?.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedNode.teamSize !== undefined && (
                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center">
                          <Users className="h-5 w-5 text-blue-500 mb-1" />
                          <p className="text-xs text-muted-foreground">
                            {t("team_size")}
                          </p>
                          <p className="text-lg font-bold">
                            {selectedNode.teamSize}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Performance meter */}
              {selectedNode.performance !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {t("Performance")}
                    </span>
                    <Badge
                      variant={
                        selectedNode.performance > 70 ? "success" : "secondary"
                      }
                    >
                      {selectedNode.performance}%
                    </Badge>
                  </div>
                  <Progress
                    value={selectedNode.performance}
                    className="h-2"
                    indicatorClassName={
                      selectedNode.performance > 80
                        ? "bg-green-500"
                        : selectedNode.performance > 50
                          ? "bg-blue-500"
                          : "bg-amber-500"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedNode.performance > 80
                      ? "Excellent performance"
                      : selectedNode.performance > 50
                        ? "Good performance"
                        : "Needs improvement"}
                  </p>
                </div>
              )}

              {/* Network position */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {t("network_position")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Network className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm">{t("Level")}</span>
                    </div>
                    <Badge variant="outline">
                      {selectedNode.level === 0 ? "Root" : selectedNode.level}
                    </Badge>
                  </div>

                  {selectedNode.level > 0 && networkData?.user && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm">{t("reports_to")}</span>
                      </div>
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {networkData.user.firstName} {networkData.user.lastName}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action buttons */}
              {selectedNode.id !== networkData.user.id && (
                <div className="flex flex-col gap-2 mt-4">
                  <Button className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    {t("contact_member")}
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    {t("view_full_profile")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setScale(Math.min(5, scale + 0.2))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("zoom_in")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setScale(Math.max(0.1, scale - 0.2))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("zoom_out")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={resetView}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("reset_view")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Node tooltip */}
        {hoveredNode && !showNodeDetails && (
          <div
            className="absolute bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border text-sm z-10 max-w-[200px] transition-opacity duration-200"
            style={{
              left: `${hoveredNode.x * scale + offset.x * scale + 20}px`,
              top: `${hoveredNode.y * scale + offset.y * scale - 80}px`,
            }}
          >
            <div className="font-medium">{hoveredNode.name}</div>
            {hoveredNode.role && (
              <div className="text-muted-foreground text-xs mt-1">
                {hoveredNode.role}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1">
              {hoveredNode.status && (
                <Badge
                  variant={
                    hoveredNode.status === "ACTIVE" ? "success" : "secondary"
                  }
                  className="text-[10px] h-4"
                >
                  {hoveredNode.status}
                </Badge>
              )}
              {hoveredNode.teamSize !== undefined && (
                <Badge variant="outline" className="text-[10px] h-4">
                  {t("team")}
                  {hoveredNode.teamSize}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("click_for_details")}
            </div>
          </div>
        )}
      </Card>

      <div className="text-sm text-muted-foreground">
        <p className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>
            {t("network_visualization_showing")}
            {graphData.nodes.length}
            {t("members_and")} {graphData.links.length}
            {t("connections")}
          </span>
        </p>
        <p className="mt-1">
          {t("click_on_any_node_to_view_detailed_information")}.{" "}
          {t("drag_to_reposition_nodes_or_pan_the_view")}.
        </p>
      </div>
    </div>
  );
}

// Colors for different levels in the unilevel system
const levelColors = [
  "#4f46e5", // Indigo
  "#3b82f6", // Blue
  "#0ea5e9", // Light Blue
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
];
