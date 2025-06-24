// 图表工具函数

// 生成随机颜色数组
function generateColors(count) {
  const colors = [
    'rgba(52, 199, 89, 0.7)',   // 绿色
    'rgba(255, 149, 0, 0.7)',   // 橙色
    'rgba(0, 122, 255, 0.7)',   // 蓝色
    'rgba(255, 59, 48, 0.7)',   // 红色
    'rgba(175, 82, 222, 0.7)',  // 紫色
    'rgba(90, 200, 250, 0.7)',  // 浅蓝色
    'rgba(255, 204, 0, 0.7)',   // 黄色
    'rgba(88, 86, 214, 0.7)'    // 靛蓝色
  ];
  
  // 如果需要的颜色数量超过预设，则重复使用
  return Array(count).fill().map((_, i) => colors[i % colors.length]);
}

// 获取图表的基本配置
function getChartConfig() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          boxWidth: 12,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        cornerRadius: 4
      }
    }
  };
}

// 创建饼图
function createPieChart(ctx, labels, data, title = '') {
  const colors = generateColors(data.length);
  
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: '#fff'
      }]
    },
    options: {
      ...getChartConfig(),
      plugins: {
        ...getChartConfig().plugins,
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16
          }
        }
      }
    }
  });
}

// 创建柱状图
function createBarChart(ctx, labels, datasets, title = '', horizontal = false) {
  const colors = generateColors(datasets.length);
  
  const chartDatasets = datasets.map((dataset, i) => ({
    label: dataset.label,
    data: dataset.data,
    backgroundColor: colors[i],
    borderWidth: 0
  }));
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: chartDatasets
    },
    options: {
      ...getChartConfig(),
      indexAxis: horizontal ? 'y' : 'x',
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          grid: {
            borderDash: [2, 4],
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      },
      plugins: {
        ...getChartConfig().plugins,
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16
          }
        }
      }
    }
  });
}

// 创建折线图
function createLineChart(ctx, labels, datasets, title = '') {
  const colors = generateColors(datasets.length);
  
  const chartDatasets = datasets.map((dataset, i) => ({
    label: dataset.label,
    data: dataset.data,
    borderColor: colors[i],
    backgroundColor: 'transparent',
    pointBackgroundColor: colors[i],
    tension: 0.3,
    borderWidth: 2
  }));
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: chartDatasets
    },
    options: {
      ...getChartConfig(),
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            borderDash: [2, 4],
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      },
      plugins: {
        ...getChartConfig().plugins,
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16
          }
        }
      }
    }
  });
} 