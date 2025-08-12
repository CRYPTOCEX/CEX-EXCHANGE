"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ZoomIn,
  DollarSign,
  Users,
  Calendar,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { NetworkData, TreeNode } from "@/store/affiliate/network-store";
import { useTranslations } from "next-intl";

interface ReferralTreeProps {
  networkData: NetworkData;
  mlmSystem: "DIRECT" | "BINARY" | "UNILEVEL" | null;
}

export function ReferralTree({ networkData, mlmSystem }: ReferralTreeProps) {
  const t = useTranslations("ext");
  const networkContainer = useRef<HTMLDivElement | null>(null);
  const [selectedUser, setSelectedUser] = useState<TreeNode | null>(null);
  const [isTransformed, setIsTransformed] = useState(false);
  const initialTransform = useRef(d3.zoomIdentity);
  const svgRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown> | null>(null);

  const nodeWidth = 72;
  const nodeHeight = 72;
  const margin = { top: 40, right: 120, bottom: 20, left: 160 };

  useEffect(() => {
    if (networkData && networkData.treeData && networkContainer.current) {
      createTree(networkContainer.current, networkData.treeData);
    }
  }, [networkData, mlmSystem]);

  const createTree = (container: HTMLDivElement, rootUser: TreeNode) => {
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    // Clear previous SVG
    d3.select(container).selectAll("svg").remove();

    // Create new SVG
    const svg = d3
      .select(container)
      .append("svg")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
      )
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svgRef.current = svg;

    // Add grid background
    const gridSpacing = 50;
    const gridLimit = 5000;
    const gridOrigin = gridLimit / 2;

    // Draw horizontal grid lines
    for (let y = -gridOrigin; y <= gridOrigin; y += gridSpacing) {
      svg
        .append("line")
        .attr("x1", -gridOrigin)
        .attr("y1", y)
        .attr("x2", gridOrigin)
        .attr("y2", y)
        .attr("stroke-width", 0.1)
        .attr("class", "stroke-gray-300 dark:stroke-gray-700");
    }

    // Draw vertical grid lines
    for (let x = -gridOrigin; x <= gridOrigin; x += gridSpacing) {
      svg
        .append("line")
        .attr("x1", x)
        .attr("y1", -gridOrigin)
        .attr("x2", x)
        .attr("y2", gridOrigin)
        .attr("stroke-width", 0.1)
        .attr("class", "stroke-gray-300 dark:stroke-gray-700");
    }

    // Create tree layout
    const treemap = d3.tree<TreeNode>().size([height, width]);

    // Create hierarchy from data
    const nodes = d3.hierarchy(rootUser, (d) => d.downlines);

    // Apply tree layout
    treemap(nodes);

    // Adjust node positions
    nodes.descendants().forEach((d) => {
      d.y = d.depth * (nodeHeight + 40);
    });

    // Create links
    svg
      .selectAll(".link")
      .data(nodes.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .style("fill", "none")
      .style("stroke", "#ccc")
      .style("stroke-width", "1px")
      .attr(
        "d",
        d3
          .linkVertical<
            d3.HierarchyPointLink<TreeNode>,
            d3.HierarchyPointNode<TreeNode>
          >()
          .x((d) => d.x)
          .y((d) => d.y)
      );

    // Create nodes
    const node = svg
      .selectAll(".node")
      .data(nodes.descendants())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("class", "node grayscale");

    // Add node avatars
    node
      .append("foreignObject")
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("x", -nodeWidth / 2)
      .attr("y", -nodeHeight / 2)
      .append("xhtml:div")
      .style("margin", "0")
      .style("padding", "0")
      .style("background-color", "none")
      .style("width", `${nodeWidth}px`)
      .style("height", `${nodeHeight}px`)
      .attr(
        "class",
        "transform hover:scale-110 transition-all duration-300 cursor-pointer relative"
      )
      .html((d) => {
        const statusClass =
          d.data.status === "ACTIVE" ? "bg-green-500" : "bg-amber-500";

        return `
            <div class="relative w-full h-full">
              <img 
                src='${d.data.avatar || `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(d.data.firstName + " " + d.data.lastName)}`}'
                alt='${d.data.firstName} ${d.data.lastName}'
                style='border-radius: 50%; width: 100%; height: 100%; object-fit: cover;'
                class='p-1 border-2 border-primary/30 bg-white dark:bg-gray-900'
              />
              <div class="absolute top-0 right-0 w-4 h-4 ${statusClass} rounded-full border-2 border-white dark:border-gray-900"></div>
            </div>
          `;
      });

    // Add node labels
    node
      .append("text")
      .attr("dy", nodeHeight / 2 + 15)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs font-medium fill-gray-700 dark:fill-gray-300")
      .text((d) => `${d.data.firstName} ${d.data.lastName}`.substring(0, 15));

    // Add click event
    node.on("click", (event, d) => selectUser(d.data));

    // Calculate the bounding box of the tree
    const treeBBox = svg.node()!.getBBox();

    // Calculate initial translate values to center the tree
    const initialX = width / 2 - treeBBox.width / 2 - treeBBox.x;
    const initialY = height / 2 - treeBBox.height / 2 - treeBBox.y;

    initialTransform.current = d3.zoomIdentity.translate(initialX, initialY);

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        const transform = event.transform;
        svg.attr("transform", transform.toString());
        setIsTransformed(
          !(
            transform.x === initialTransform.current.x &&
            transform.y === initialTransform.current.y &&
            transform.k === 1
          )
        );
      });

    zoomRef.current = zoom;

    // Apply zoom behavior
    d3.select(container)
      .select("svg")
      .call(zoom)
      .call(zoom.transform, initialTransform.current)
      .on("dblclick.zoom", null);

    // Select root user by default
    selectUser(rootUser);
  };

  const selectUser = (profile: TreeNode): void => {
    setSelectedUser(profile);

    // Reset all nodes and links
    d3.selectAll(".node").classed("grayscale-0", false);
    d3.selectAll(".link").style("stroke", "#ccc");

    // Find the selected node
    const selectedD3Node = d3
      .selectAll(".node")
      .filter((d) => (d as any).data.id === profile.id);

    if (!selectedD3Node.empty()) {
      // Highlight selected node
      selectedD3Node.classed("grayscale-0", true);

      // Get ancestors of selected node
      const ancestors = (selectedD3Node.datum() as any).ancestors();

      // Highlight links to ancestors
      d3.selectAll(".link")
        .style("stroke", (d) => {
          return ancestors.includes((d as any).target) ? "#4f46e5" : "#ccc";
        })
        .style("stroke-width", (d) =>
          ancestors.includes((d as any).target) ? "2px" : "1px"
        );

      // Highlight ancestor nodes
      d3.selectAll(".node")
        .filter((d) => ancestors.includes(d))
        .classed("grayscale-0", true);
    }
  };

  const resetView = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(networkContainer.current)
        .select("svg")
        .call(zoomRef.current.transform, initialTransform.current);

      svgRef.current
        .transition()
        .duration(750)
        .attr("transform", initialTransform.current.toString());

      setIsTransformed(false);
    }
  };

  const deselectUser = () => {
    setSelectedUser(null);
    d3.selectAll(".node").classed("grayscale-0", false);
    d3.selectAll(".link").style("stroke", "#ccc").style("stroke-width", "1px");
  };

  return (
    <div className="space-y-4">
      <Card className="w-full h-[600px] overflow-hidden relative">
        {/* Reset view button */}
        {isTransformed && (
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
            onClick={resetView}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        )}

        {/* Selected user details */}
        {selectedUser && (
          <div className="absolute top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-sm border-l shadow-xl p-4 overflow-y-auto transition-transform duration-300 transform translate-x-0 animate-in slide-in-from-right z-50">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{t("member_profile")}</h3>
              <Button variant="ghost" size="icon" onClick={deselectUser}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Profile header */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={selectedUser.avatar || ""} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {selectedUser.firstName.charAt(0)}
                      {selectedUser.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser.status && (
                    <Badge
                      variant={
                        selectedUser.status === "ACTIVE"
                          ? "success"
                          : "secondary"
                      }
                      className="absolute -bottom-2 right-0 px-2 py-1"
                    >
                      {selectedUser.status}
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-muted-foreground">{selectedUser.role}</p>
                {selectedUser.joinDate && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {t("Joined")}
                      {selectedUser.joinDate}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Stats cards */}
              {selectedUser.earnings !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <div className="p-3">
                      <div className="flex flex-col items-center">
                        <DollarSign className="h-5 w-5 text-primary mb-1" />
                        <p className="text-xs text-muted-foreground">
                          {t("Earnings")}
                        </p>
                        <p className="text-lg font-bold">
                          / $
                          {selectedUser.earnings?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {selectedUser.teamSize !== undefined && (
                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                      <div className="p-3">
                        <div className="flex flex-col items-center">
                          <Users className="h-5 w-5 text-blue-500 mb-1" />
                          <p className="text-xs text-muted-foreground">
                            {t("team_size")}
                          </p>
                          <p className="text-lg font-bold">
                            {selectedUser.teamSize}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Performance meter */}
              {selectedUser.performance !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {t("Performance")}
                    </span>
                    <Badge
                      variant={
                        selectedUser.performance > 70 ? "success" : "secondary"
                      }
                    >
                      {selectedUser.performance}%
                    </Badge>
                  </div>
                  <Progress
                    value={selectedUser.performance}
                    className="h-2"
                    indicatorClassName={
                      selectedUser.performance > 80
                        ? "bg-green-500"
                        : selectedUser.performance > 50
                          ? "bg-blue-500"
                          : "bg-amber-500"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.performance > 80
                      ? "Excellent performance"
                      : selectedUser.performance > 50
                        ? "Good performance"
                        : "Needs improvement"}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {selectedUser.id !== networkData.user.id && (
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

        {/* Tree visualization container */}
        <div
          className="relative w-full overflow-hidden z-0 rounded-lg h-full"
          ref={networkContainer}
        />
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>
          {t("click_on_any_member_to_view_their_details")}.{" "}
          {t("use_mouse_wheel_to_zoom_and_drag_to_pan_the_view")}.
        </p>
      </div>
    </div>
  );
}
