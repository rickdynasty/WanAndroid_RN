import React from 'react';
import {DeviceEventEmitter, FlatList, RefreshControl} from 'react-native';
import HttpUtils from "../../http/HttpUtils";
import LoadingView from "../../widget/LoadingView";
import ErrorView from "../../widget/ErrorView";
import EmptyView from "../../widget/EmptyView";
import ArticleItemView from "../../widget/ArticleItemView";
import LineDivider from "../../widget/LineDivider";
import EndView from "../../widget/EndView";
import * as config from "../../config";

let favoriteSubscription;

export default class App extends React.Component {

    static navigationOptions = {
        title: "我的收藏",
    };

    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            isError: false,
            errorInfo: "",
            isAllLoaded: false,
            isLoadMoreFailed: false,
            pageNo: 0,
            data: []
        };
    }

    componentDidMount() {
        favoriteSubscription = DeviceEventEmitter.addListener('switchFavorite', ()=>{
            this.setState({
                pageNo: 0,
            });
            setTimeout(() => {
                this.getData();
            }, 500);
        });
        this.getData();
    }

    componentWillUnmount() {
        DeviceEventEmitter.removeSubscription(favoriteSubscription);
    }

    getData(isLoadingMore) {
        HttpUtils.get("lg/collect/list/" + this.state.pageNo + "/json", null)
            .then(result => {
                this.setState({
                    isLoading: false,
                    isError: false,
                    isLoadMoreFailed: false,
                    pageNo: this.state.pageNo + 1,
                    isAllLoaded: this.state.pageNo + 1 > result.pageCount,
                    data: isLoadingMore ? [...this.state.data, ...result.datas] : result.datas
                });
            })
            .catch(error => {
                this.setState({
                    isLoading: false,
                    isError: !isLoadingMore,
                    errorInfo: error,
                    isLoadMoreFailed: isLoadingMore,
                })
            });
    }

    retry() {
        this.setState({
            isLoading: true,
            pageNo: 0,
        });
        setTimeout(() => {
            this.getData();
        }, 500);
    }

    render() {
        if (this.state.isLoading) {
            return <LoadingView/>;
        } else if (this.state.isError) {
            return <ErrorView error={this.state.errorInfo} retry={this.retry.bind(this)}/>;
        } else if (this.state.data.length === 0) {
            return <EmptyView retry={this.retry.bind(this)}/>;
        }
        return <FlatList
            data={this.state.data}
            renderItem={(info) => {
                info.item.collect = true;
                return <ArticleItemView item={info.item} isFromFavorite={true}/>
            }}
            refreshControl={<RefreshControl
                onRefresh={() => {
                    this.state.pageNo = 0;
                    this.getData();
                }}
                refreshing={this.state.pageNo === 0}
                colors={config.refreshColors}
            />}
            onEndReached={() => {
                if (!this.state.isAllLoaded) {
                    this.loadMore();
                }
            }}
            ListFooterComponent={() => {
                if (this.state.isAllLoaded) {
                    return <EndView/>;
                } else if (this.state.isLoadMoreFailed) {
                    return <ErrorView error={this.state.errorInfo} retry={this.loadMore.bind(this)}/>;
                } else {
                    return <LoadingView size={'small'}/>;
                }
            }}
            keyExtractor={(item, index) => index + ""}
            ItemSeparatorComponent={LineDivider}
        />;
    }

    loadMore() {
        this.setState({isLoadMoreFailed: false});
        this.getData(true);
    }
}