      const commoditiesData = {
        wheat: {
          name: "Wheat (Gehun)",
          modalPrice: "₹2,420",
          deltaText: "+3.4% (7D)",
          deltaPos: true,
          variety: "Sharbati / Dara grade avg across 142 mandis",
          msp: "₹2,275",
          mspDelta: "+₹145 vs MSP",
          mspStatus: "Trading 6.3% above central MSP floor",
          arrivals: "48,320",
          spread: "₹2,280 – ₹2,610",
          spreadHigh: "Kota Mandi (₹2,610)",
          mspNum: 2275,
          yBounds: { min: 2150, max: 2650 },
          points: [
            { date: "24 Mar", price: 2290, arrivals: "31,400" },
            { date: "28 Mar", price: 2315, arrivals: "34,200" },
            { date: "01 Apr", price: 2340, arrivals: "38,900" },
            { date: "05 Apr", price: 2330, arrivals: "41,000" },
            { date: "09 Apr", price: 2380, arrivals: "44,500" },
            { date: "13 Apr", price: 2405, arrivals: "46,100" },
            { date: "18 Apr", price: 2420, arrivals: "48,320" }
          ],
          states: [
            { name: "Madhya Pradesh", mandi: "Ujjain / Indore", price: 2510, pct: 96 },
            { name: "Rajasthan", mandi: "Kota / Baran", price: 2470, pct: 93 },
            { name: "Punjab", mandi: "Khanna / Rajpura", price: 2420, pct: 90 },
            { name: "Uttar Pradesh", mandi: "Hardoi / Agra", price: 2360, pct: 86 },
            { name: "Haryana", mandi: "Karnal / Kurukshetra", price: 2340, pct: 84 }
          ]
        },
        mustard: {
          name: "Mustard (Sarson)",
          modalPrice: "₹5,450",
          deltaText: "+1.8% (7D)",
          deltaPos: true,
          variety: "42% Oil content grade across 88 mandis",
          msp: "₹5,650",
          mspDelta: "-₹200 vs MSP",
          mspStatus: "Trading 3.5% below MSP benchmark",
          arrivals: "32,150",
          spread: "₹5,100 – ₹5,750",
          spreadHigh: "Bharatpur Mandi (₹5,750)",
          mspNum: 5650,
          yBounds: { min: 5000, max: 6000 },
          points: [
            { date: "24 Mar", price: 5240, arrivals: "22,000" },
            { date: "28 Mar", price: 5290, arrivals: "24,500" },
            { date: "01 Apr", price: 5350, arrivals: "28,100" },
            { date: "05 Apr", price: 5320, arrivals: "29,400" },
            { date: "09 Apr", price: 5390, arrivals: "31,000" },
            { date: "13 Apr", price: 5410, arrivals: "31,900" },
            { date: "18 Apr", price: 5450, arrivals: "32,150" }
          ],
          states: [
            { name: "Rajasthan", mandi: "Bharatpur / Alwar", price: 5620, pct: 95 },
            { name: "Haryana", mandi: "Rewari / Hisar", price: 5510, pct: 91 },
            { name: "Madhya Pradesh", mandi: "Morena / Gwalior", price: 5420, pct: 88 },
            { name: "Uttar Pradesh", mandi: "Mathura / Agra", price: 5340, pct: 85 },
            { name: "Gujarat", mandi: "Deesa / Mehsana", price: 5280, pct: 82 }
          ]
        },
        onion: {
          name: "Onion (Pyaz)",
          modalPrice: "₹1,850",
          deltaText: "-4.2% (7D)",
          deltaPos: false,
          variety: "Nashik Red medium / Garva crop",
          msp: "Not Covered",
          mspDelta: "Perishable item",
          mspStatus: "No statutory MSP floor for onion",
          arrivals: "64,200",
          spread: "₹1,400 – ₹2,350",
          spreadHigh: "Bengaluru Mandi (₹2,350)",
          mspNum: null,
          yBounds: { min: 1400, max: 2400 },
          points: [
            { date: "24 Mar", price: 2120, arrivals: "48,000" },
            { date: "28 Mar", price: 2060, arrivals: "51,200" },
            { date: "01 Apr", price: 1980, arrivals: "55,000" },
            { date: "05 Apr", price: 1940, arrivals: "58,300" },
            { date: "09 Apr", price: 1900, arrivals: "61,200" },
            { date: "13 Apr", price: 1870, arrivals: "63,100" },
            { date: "18 Apr", price: 1850, arrivals: "64,200" }
          ],
          states: [
            { name: "Maharashtra", mandi: "Lasalgaon / Pimpalgaon", price: 1680, pct: 72 },
            { name: "Karnataka", mandi: "Yeshwanthpur / Hubli", price: 2150, pct: 92 },
            { name: "Madhya Pradesh", mandi: "Neemuch / Mandsaur", price: 1720, pct: 75 },
            { name: "Gujarat", mandi: "Mahuva / Gondal", price: 1790, pct: 78 },
            { name: "Delhi (NCT)", mandi: "Azadpur Mandi", price: 2280, pct: 97 }
          ]
        },
        cotton: {
          name: "Cotton (Kapas)",
          modalPrice: "₹7,220",
          deltaText: "+2.1% (7D)",
          deltaPos: true,
          variety: "Medium Staple (27.5-28.5mm)",
          msp: "₹7,121",
          mspDelta: "+₹99 vs MSP",
          mspStatus: "Trading marginally above CCI support",
          arrivals: "21,400",
          spread: "₹6,850 – ₹7,650",
          spreadHigh: "Rajkot Mandi (₹7,650)",
          mspNum: 7121,
          yBounds: { min: 6700, max: 7800 },
          points: [
            { date: "24 Mar", price: 6980, arrivals: "16,000" },
            { date: "28 Mar", price: 7040, arrivals: "17,200" },
            { date: "01 Apr", price: 7110, arrivals: "18,900" },
            { date: "05 Apr", price: 7130, arrivals: "19,500" },
            { date: "09 Apr", price: 7180, arrivals: "20,100" },
            { date: "13 Apr", price: 7200, arrivals: "20,900" },
            { date: "18 Apr", price: 7220, arrivals: "21,400" }
          ],
          states: [
            { name: "Gujarat", mandi: "Rajkot / Amreli", price: 7520, pct: 96 },
            { name: "Maharashtra", mandi: "Jalna / Akola", price: 7310, pct: 92 },
            { name: "Telangana", mandi: "Warangal / Adilabad", price: 7240, pct: 90 },
            { name: "Punjab", mandi: "Abohar / Bathinda", price: 7150, pct: 88 },
            { name: "Madhya Pradesh", mandi: "Khargone / Khandwa", price: 7090, pct: 86 }
          ]
        },
        chana: {
          name: "Chana (Bengal Gram)",
          modalPrice: "₹5,880",
          deltaText: "+4.1% (7D)",
          deltaPos: true,
          variety: "Desi Chana clean sorted grade",
          msp: "₹5,440",
          mspDelta: "+₹440 vs MSP",
          mspStatus: "Trading 8.1% above MSP support level",
          arrivals: "29,600",
          spread: "₹5,600 – ₹6,150",
          spreadHigh: "Bikaner Mandi (₹6,150)",
          mspNum: 5440,
          yBounds: { min: 5200, max: 6300 },
          points: [
            { date: "24 Mar", price: 5540, arrivals: "20,500" },
            { date: "28 Mar", price: 5610, arrivals: "22,400" },
            { date: "01 Apr", price: 5690, arrivals: "24,800" },
            { date: "05 Apr", price: 5740, arrivals: "26,100" },
            { date: "09 Apr", price: 5790, arrivals: "27,300" },
            { date: "13 Apr", price: 5830, arrivals: "28,700" },
            { date: "18 Apr", price: 5880, arrivals: "29,600" }
          ],
          states: [
            { name: "Rajasthan", mandi: "Bikaner / Jaipur", price: 6020, pct: 95 },
            { name: "Madhya Pradesh", mandi: "Vidisha / Sagar", price: 5910, pct: 92 },
            { name: "Maharashtra", mandi: "Latur / Solapur", price: 5850, pct: 89 },
            { name: "Karnataka", mandi: "Gulbarga / Bidar", price: 5780, pct: 87 },
            { name: "Uttar Pradesh", mandi: "Banda / Jhansi", price: 5720, pct: 85 }
          ]
        }
      };

      let currentCrop = "wheat";

      function switchCrop(cropKey) {
        if (!commoditiesData[cropKey]) return;
        currentCrop = cropKey;

        // Update Pill buttons
        document.querySelectorAll('.commodity-selector .pill-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-crop') === cropKey);
        });

        // Update Bottom Quick cards
        document.querySelectorAll('.crop-card').forEach(card => {
          card.classList.remove('active-crop');
        });
        const activeCard = document.getElementById(`cropCard-${cropKey}`);
        if (activeCard) activeCard.classList.add('active-crop');

        renderCommodity(cropKey);
      }

      function setTimeframe(btn, tf) {
        document.querySelectorAll('.timeframe-group .time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Redraw with current crop
        renderCommodity(currentCrop);
      }

      function renderCommodity(key) {
        const data = commoditiesData[key];
        if (!data) return;

        // Update Text & KPI cards
        document.getElementById('chartTitle').textContent = `${data.name} Modal Price Movement`;
        document.getElementById('stateCompareTitle').textContent = `${data.name} State Comparison`;

        const kpiPrice = document.getElementById('kpiPrice');
        kpiPrice.innerHTML = `${data.modalPrice}<span style="font-size: 15px; font-weight: 500; color: var(--muted);"> /Qtl</span>`;

        const kpiDelta = document.getElementById('kpiChange');
        kpiDelta.textContent = data.deltaText;
        kpiDelta.className = `badge-delta ${data.deltaPos ? 'pos' : 'neg'}`;

        document.getElementById('kpiVariety').textContent = data.variety;

        const kpiMsp = document.getElementById('kpiMsp');
        kpiMsp.innerHTML = `${data.msp}${data.msp !== 'Not Covered' ? '<span style="font-size: 15px; font-weight: 500; color: var(--muted);"> /Qtl</span>' : ''}`;

        const kpiMspDelta = document.getElementById('kpiMspDelta');
        kpiMspDelta.textContent = data.mspDelta;
        kpiMspDelta.className = `badge-delta ${data.deltaPos ? 'pos' : 'neg'}`;

        document.getElementById('kpiMspStatus').textContent = data.mspStatus;

        document.getElementById('kpiArrivals').innerHTML = `${data.arrivals}<span style="font-size: 15px; font-weight: 500; color: var(--muted);"> Quintals</span>`;
        document.getElementById('kpiSpread').textContent = data.spread;

        // Render Trend SVG Graph
        renderTrendGraph(data);

        // Render State Comparison Bars
        renderStateBars(data.states);
      }

      function renderTrendGraph(data) {
        const svg = document.getElementById('trendSvg');
        const minX = 65;
        const maxX = 615;
        const minY = 35;
        const maxY = 220;
        const { min, max } = data.yBounds;

        // Update Y Axis labels
        const step = (max - min) / 4;
        document.getElementById('yMaxLabel').textContent = `₹${Math.round(max).toLocaleString('en-IN')}`;
        document.getElementById('yMidMaxLabel').textContent = `₹${Math.round(min + step * 3).toLocaleString('en-IN')}`;
        document.getElementById('yMidLabel').textContent = `₹${Math.round(min + step * 2).toLocaleString('en-IN')}`;
        document.getElementById('yMidMinLabel').textContent = `₹${Math.round(min + step).toLocaleString('en-IN')}`;
        document.getElementById('yMinLabel').textContent = `₹${Math.round(min).toLocaleString('en-IN')}`;

        // MSP Benchmark line handling
        const mspLine = document.getElementById('mspLine');
        const mspLineText = document.getElementById('mspLineText');
        if (data.mspNum && data.mspNum >= min && data.mspNum <= max) {
          const mspY = maxY - ((data.mspNum - min) / (max - min)) * (maxY - minY);
          mspLine.setAttribute('y1', mspY);
          mspLine.setAttribute('y2', mspY);
          mspLine.style.display = 'block';
          mspLineText.setAttribute('y', mspY - 6);
          mspLineText.textContent = `MSP: ₹${data.mspNum.toLocaleString('en-IN')}`;
          mspLineText.style.display = 'block';
        } else {
          mspLine.style.display = 'none';
          mspLineText.style.display = 'none';
        }

        // Coordinates calculations
        const points = data.points;
        const xStep = (maxX - minX) / (points.length - 1);
        const coords = points.map((p, i) => {
          const x = minX + i * xStep;
          const y = maxY - ((p.price - min) / (max - min)) * (maxY - minY);
          return { x, y, price: p.price, date: p.date, arrivals: p.arrivals };
        });

        // Generate Path strings
        let linePath = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
          const prev = coords[i - 1];
          const curr = coords[i];
          const cp1x = prev.x + (curr.x - prev.x) / 2;
          const cp1y = prev.y;
          const cp2x = prev.x + (curr.x - prev.x) / 2;
          const cp2y = curr.y;
          linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }
        document.getElementById('svgLine').setAttribute('d', linePath);

        const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${maxY} L ${coords[0].x} ${maxY} Z`;
        document.getElementById('svgArea').setAttribute('d', areaPath);

        // Render Dots and Tooltips
        const dotsGroup = document.getElementById('svgDots');
        const labelsGroup = document.getElementById('svgXLabels');
        dotsGroup.innerHTML = '';
        labelsGroup.innerHTML = '';

        const tooltip = document.getElementById('chartTooltip');
        const container = document.getElementById('chartContainer');

        coords.forEach((pt, idx) => {
          // Circle Dot
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', pt.x);
          dot.setAttribute('cy', pt.y);
          dot.setAttribute('class', 'chart-dot');
          
          dot.addEventListener('mouseenter', (e) => {
            const svgRect = svg.getBoundingClientRect();
            const contRect = container.getBoundingClientRect();
            const scaleX = contRect.width / 650;
            const scaleY = contRect.height / 260;

            document.getElementById('tooltipDate').textContent = pt.date;
            document.getElementById('tooltipPrice').textContent = `₹${pt.price.toLocaleString('en-IN')} / Qtl`;
            document.getElementById('tooltipArrivals').textContent = `Arrivals: ${pt.arrivals} Qtl`;

            tooltip.style.left = `${pt.x * scaleX}px`;
            tooltip.style.top = `${pt.y * scaleY}px`;
            tooltip.style.opacity = '1';
          });

          dot.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
          });

          dotsGroup.appendChild(dot);

          // X Axis Label
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', pt.x);
          text.setAttribute('y', maxY + 18);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('class', 'chart-axis-label');
          text.textContent = pt.date;
          labelsGroup.appendChild(text);
        });
      }

      function renderStateBars(states) {
        const container = document.getElementById('stateBarsContainer');
        container.innerHTML = '';

        states.forEach((st, idx) => {
          const row = document.createElement('div');
          row.className = 'state-bar-row';
          row.innerHTML = `
            <div class="state-row-top">
              <span class="state-name">
                ${st.name}
                <span class="state-mandi-tag">${st.mandi}</span>
              </span>
              <span class="state-price">₹${st.price.toLocaleString('en-IN')}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${idx === 0 ? 'highlight' : ''}" style="width: 0%;"></div>
            </div>
          `;
          container.appendChild(row);

          // Animate bar width smoothly
          setTimeout(() => {
            const fill = row.querySelector('.bar-fill');
            if (fill) fill.style.width = `${st.pct}%`;
          }, 30);
        });
      }

      // Initialize on load
      document.addEventListener('DOMContentLoaded', () => {
        renderCommodity('wheat');
      });
      // Fallback invocation in case DOM is already ready
      renderCommodity('wheat');